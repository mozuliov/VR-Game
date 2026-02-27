import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Rollback to a specific round_id
export async function POST(request, { params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== 'Bearer silicon_master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const roundId = parseInt((await params).roundId);

        // Find targeted snapshot
        const { data: snapshot, error: snapErr } = await supabase
            .from('history_snapshots')
            .select('*')
            .eq('round_id', roundId)
            .eq('timeline_status', 'active')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (snapErr || !snapshot) {
            return NextResponse.json({ error: 'Snapshot not found for that round' }, { status: 404 });
        }

        const stateData = typeof snapshot.state_data === 'string' ? JSON.parse(snapshot.state_data) : snapshot.state_data;

        // Mark all snapshots AFTER this round as "shadow"
        const { error: updateErr } = await supabase
            .from('history_snapshots')
            .update({ timeline_status: 'shadow' })
            .gt('round_id', roundId);

        if (updateErr) throw updateErr;

        // Restore company states from snapshot
        for (const company of stateData.companies) {
            await supabase.from('companies').update({
                cash: company.cash,
                accounts_receivable: company.accounts_receivable,
                inventory_units: company.inventory_units,
                fixed_assets_gross: company.fixed_assets_gross,
                accumulated_depreciation: company.accumulated_depreciation,
                accounts_payable: company.accounts_payable,
                credit_line: company.credit_line,
                bank_loan: company.bank_loan,
                retained_earnings: company.retained_earnings,
                brand_equity: company.brand_equity,
                is_frozen: company.is_frozen || 0,
                comp_display_level: company.comp_display_level,
                comp_optics_level: company.comp_optics_level,
                comp_tracking_level: company.comp_tracking_level,
                comp_processor_level: company.comp_processor_level,
                prev_price: company.prev_price,
                prev_production_volume: company.prev_production_volume,
                prev_brand_spend: company.prev_brand_spend,
                prev_capex: 0,
                prev_rd_upgrade_fees: 0,
                prev_credit_draw: 0,
                prev_credit_repay: 0,
                prev_loan_draw: 0,
                prev_loan_repay: 0
            }).eq('company_id', company.company_id);
        }

        // Restore market state
        const ms = stateData.market_state;
        const { error: msErr } = await supabase
            .from('market_state')
            .update({
                current_quarter: ms.current_quarter,
                market_size: ms.market_size,
                growth_rate_percent: ms.growth_rate_percent
            })
            .eq('id', 1);

        if (msErr) throw msErr;

        return NextResponse.json({ success: true, restored_to_quarter: roundId });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
