import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Returns per-quarter financial history for a specific company, extracted from snapshots.
// Each snapshot's state_data contains a "companies" array — we find the matching company.
export async function GET(request, { params }) {
    try {
        const companyId = (await params).id;

        const { data: snapshots, error } = await supabase
            .from('history_snapshots')
            .select('round_id, timestamp, state_data')
            .eq('timeline_status', 'active')
            .order('round_id', { ascending: true });

        if (error) throw error;

        const history = [];

        for (const snap of snapshots) {
            let stateData = typeof snap.state_data === 'string' ? JSON.parse(snap.state_data) : snap.state_data;
            if (!stateData) continue;

            const company = (stateData.companies || []).find(c => c.company_id === companyId);
            if (!company) continue;

            const market = stateData.market_state || {};
            const unitCost = estimateUnitCost(company);
            const netFixed = (company.fixed_assets_gross || 0) - (company.accumulated_depreciation || 0);
            const inventory_value = (company.inventory_units || 0) * unitCost;
            const totalAssets = (company.cash || 0) + (company.accounts_receivable || 0) + inventory_value + netFixed;
            const totalDebt = (company.credit_line || 0) + (company.bank_loan || 0);
            const totalEquity = (company.shareholders_equity || 0) + (company.retained_earnings || 0);

            let allComps = stateData.companies || [];
            let totalMkt = allComps.reduce((s, x) => s + Math.max(x.brand_equity || 0, 0), 0) || 1;
            let mktShare = (company.brand_equity || 0) / totalMkt;
            let weighted_score = (0.4 * totalEquity + 0.4 * mktShare * 100000 + 0.2 * (company.brand_equity || 0));

            history.push({
                quarter: `Q${snap.round_id}`,
                round_id: snap.round_id,
                // Balance Sheet
                cash: Math.round(company.cash || 0),
                total_equity: Math.round(totalEquity),
                retained_earnings: Math.round(company.retained_earnings || 0),
                total_assets: Math.round(totalAssets),
                total_debt: Math.round(totalDebt),
                weighted_score: Math.round(weighted_score),
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
                market_share: Number((company.market_share || 0).toFixed(1)),
                // Full company data for financial statements
                raw_company: company,
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
