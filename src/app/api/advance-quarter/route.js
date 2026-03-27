import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { calculateTechScore, calculateAttractiveness, applyBrandEquityChanges, allocateSales } from '@/lib/engine/market';
import { computeLedger, calculateMaxProductionCapacity } from '@/lib/engine/finance';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== 'Bearer silicon_master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: marketState, error: msErr } = await supabase.from('market_state').select('*').eq('id', 1).single();
        if (msErr || !marketState) return NextResponse.json({ error: 'Game not initialized' }, { status: 400 });

        const { data: companies, error: compErr } = await supabase.from('companies').select('*');
        if (compErr) throw compErr;

        // --- STEP 1: Save a snapshot of the current state ("Time Machine") ---
        const { error: histErr } = await supabase.from('history_snapshots').insert([{
            round_id: marketState.current_quarter,
            timestamp: new Date().toISOString(),
            state_data: { companies, market_state: marketState },
            timeline_status: 'active'
        }]);
        if (histErr) throw histErr;

        // --- STEP 2: Update AI competitor decisions ---
        const anyPlayerTechScore11plus = companies.filter(c => !c.is_ai && calculateTechScore(c) >= 11).length > 0;

        for (const company of companies) {
            if (!company.is_ai) continue;

            if (company.company_id === 'APEX_OPTIC') {
                const apex_brand_spend = anyPlayerTechScore11plus ? 20000 : 10000;
                company.prev_brand_spend = apex_brand_spend;
                // Apex never upgrades fixed assets, stays at existing inventory level
                company.prev_production_volume = 3500;
                company.prev_price = Math.max(1500, company.prev_price);
            }

            if (company.company_id === 'VALUE_VIRTUA') {
                // ValueVirtua matches lowest player price if within 10%
                const lowestPlayerPrice = Math.min(...companies.filter(c => !c.is_ai && c.prev_price > 0).map(c => c.prev_price));
                if (lowestPlayerPrice <= company.prev_price * 1.1) {
                    company.prev_price = lowestPlayerPrice;
                }
                // If market share < 15%, drop price by $10 (we'll approximate by checking inventory vs market)
                company.prev_production_volume = 3000;
                company.prev_brand_spend = 2000;
            }
        }

        // --- STEP 3: Calculate Attractiveness & Allocate Sales ---
        for (const company of companies) {
            company.tech_score = calculateTechScore(company);
            company.brand_equity_new = applyBrandEquityChanges(company, company.prev_brand_spend || 0);
            company.attractiveness = calculateAttractiveness(company.tech_score, company.prev_price || 1, company.brand_equity_new);
        }

        // Allocate demand using the Logit Market Model
        const sortedCompanies = allocateSales(companies, marketState.market_size);

        // Calculate actual market share based on exact units sold
        const totalUnitsSold = companies.reduce((sum, c) => sum + (c.actual_sales || 0), 0);
        for (const company of companies) {
            company.market_share = totalUnitsSold > 0 ? ((company.actual_sales || 0) / totalUnitsSold) * 100 : 0;
        }

        // --- STEP 4: Compute Financials for each company ---
        for (const company of companies) {
            let prevLedger = marketState.current_quarter > 1 ? {
                accounts_receivable: company.accounts_receivable,
                accounts_payable: company.accounts_payable,
            } : null;

            const netFixed = company.fixed_assets_gross - company.accumulated_depreciation;
            const maxProduction = calculateMaxProductionCapacity(netFixed);
            const unitsProduced = Math.min(company.prev_production_volume || 0, maxProduction);

            // Frozen companies can't spend on marketing/R&D
            const isFrozen = company.is_frozen === 1 || company.is_frozen === true;

            const activeQuarterData = {
                unitsSold: company.actual_sales || 0,
                unitsProduced,
                price: company.prev_price || 0,
                brandSpend: isFrozen ? 0 : (company.prev_brand_spend || 0),
                marketingSpend: 0,
                capEx: company.prev_capex || 0,
                rdUpgradeFees: isFrozen ? 0 : (company.prev_rd_upgrade_fees || 0),
                newDebt_CreditLine: company.prev_credit_draw || 0,
                newDebt_BankLoan: company.prev_loan_draw || 0,
                repayment_CreditLine: company.prev_credit_repay || 0,
                repayment_BankLoan: company.prev_loan_repay || 0,
            };

            const ledger = computeLedger(company, prevLedger, activeQuarterData);
            company.new_ledger = ledger;
            company.new_brand_equity = company.brand_equity_new;
        }

        // --- STEP 5: Persist updated company state ---
        for (const company of companies) {
            const l = company.new_ledger;
            const newFrozen = l.isLiquidityFreeze ? 1 : 0;

            const { error: updateErr } = await supabase.from('companies').update({
                cash: l.BS.A1,
                accounts_receivable: l.BS.A2,
                inventory_units: l.inventory_units,
                fixed_assets_gross: l.BS.A6,
                accumulated_depreciation: l.BS.A7,
                accounts_payable: l.BS.A10,
                credit_line: l.BS.A11,
                bank_loan: l.BS.A13,
                retained_earnings: l.BS.A17,
                brand_equity: company.new_brand_equity,
                market_share: company.market_share || 0,
                is_frozen: newFrozen,
                last_q_ledger: { P_L: l.P_L, CFO: l.CFO, unitBuildCost: l.unitBuildCost },
                prev_capex: 0,
                prev_rd_upgrade_fees: 0,
                prev_credit_draw: 0,
                prev_credit_repay: 0,
                prev_loan_draw: 0,
                prev_loan_repay: 0
            }).eq('company_id', company.company_id);
            if (updateErr) throw updateErr;
        }

        // --- STEP 6: Advance Market ---
        const newMarketSize = Math.floor(marketState.market_size * (1 + (marketState.growth_rate_percent / 100)));
        const { error: msUpdateErr } = await supabase.from('market_state').update({
            current_quarter: marketState.current_quarter + 1,
            market_size: newMarketSize
        }).eq('id', 1);
        if (msUpdateErr) throw msUpdateErr;

        // --- STEP 7: Return summary data ---
        const { data: updatedCompanies, error: updatedErr } = await supabase.from('companies').select('*');
        if (updatedErr) throw updatedErr;

        return NextResponse.json({
            success: true,
            new_quarter: marketState.current_quarter + 1,
            companies: updatedCompanies
        });
    } catch (e) {
        console.error('advance-quarter error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
