import { NextResponse } from 'next/server';
import { allQuery } from '@/lib/db';

// Returns per-quarter financial history for a specific company, extracted from snapshots.
// Each snapshot's state_data contains a "companies" array — we find the matching company.
export async function GET(request, { params }) {
    try {
        const companyId = (await params).id;

        const snapshots = await allQuery(
            `SELECT round_id, timestamp, state_data 
       FROM history_snapshots 
       WHERE timeline_status = 'active' 
       ORDER BY round_id ASC`
        );

        const history = [];

        for (const snap of snapshots) {
            let stateData;
            try {
                stateData = JSON.parse(snap.state_data);
            } catch {
                continue;
            }

            const company = (stateData.companies || []).find(c => c.company_id === companyId);
            if (!company) continue;

            const market = stateData.market_state || {};
            const unitCost = estimateUnitCost(company);
            const netFixed = (company.fixed_assets_gross || 0) - (company.accumulated_depreciation || 0);
            const inventory_value = (company.inventory_units || 0) * unitCost;
            const totalAssets = (company.cash || 0) + (company.accounts_receivable || 0) + inventory_value + netFixed;
            const totalDebt = (company.credit_line || 0) + (company.bank_loan || 0);
            const totalEquity = (company.shareholders_equity || 0) + (company.retained_earnings || 0);

            history.push({
                quarter: `Q${snap.round_id}`,
                round_id: snap.round_id,
                // Balance Sheet
                cash: Math.round(company.cash || 0),
                total_equity: Math.round(totalEquity),
                retained_earnings: Math.round(company.retained_earnings || 0),
                total_assets: Math.round(totalAssets),
                total_debt: Math.round(totalDebt),
                // Operations
                brand_equity: Math.round(company.brand_equity || 0),
                inventory_units: company.inventory_units || 0,
                // Tech
                tech_score:
                    (company.comp_display_level || 1) +
                    (company.comp_optics_level || 1) +
                    (company.comp_tracking_level || 1) +
                    (company.comp_processor_level || 1),
                // Market
                market_size: market.market_size || 0,
            });
        }

        return NextResponse.json(history);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Rough unit cost re-estimation (mirrors finance.js)
function estimateUnitCost(company) {
    const displayCosts = { 1: 80, 2: 150, 3: 300 };
    const opticsCosts = { 1: 20, 2: 60, 3: 120 };
    const trackingCosts = { 1: 30, 2: 100, 3: 250 };
    const procCosts = { 1: 50, 2: 120, 3: 280 };
    return 50
        + (displayCosts[company.comp_display_level] || 80)
        + (opticsCosts[company.comp_optics_level] || 20)
        + (trackingCosts[company.comp_tracking_level] || 30)
        + (procCosts[company.comp_processor_level] || 50);
}
