import { NextResponse } from 'next/server';
import { getQuery, allQuery, runQuery } from '@/lib/db';

// Rollback to a specific round_id
export async function POST(request, { params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== 'Bearer silicon_master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const roundId = parseInt((await params).roundId);

        // Find targeted snapshot
        const snapshot = await getQuery(
            `SELECT * FROM history_snapshots WHERE round_id = ? AND timeline_status = 'active' ORDER BY id DESC LIMIT 1`,
            [roundId]
        );

        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found for that round' }, { status: 404 });
        }

        const stateData = JSON.parse(snapshot.state_data);

        // Mark all snapshots AFTER this round as "shadow"
        await runQuery(
            `UPDATE history_snapshots SET timeline_status = 'shadow' WHERE round_id > ?`,
            [roundId]
        );

        // Restore company states from snapshot
        for (const company of stateData.companies) {
            await runQuery(`
        UPDATE companies SET
          cash = ?, accounts_receivable = ?, inventory_units = ?,
          fixed_assets_gross = ?, accumulated_depreciation = ?,
          accounts_payable = ?, credit_line = ?, bank_loan = ?,
          retained_earnings = ?, brand_equity = ?, is_frozen = ?,
          comp_display_level = ?, comp_optics_level = ?,
          comp_tracking_level = ?, comp_processor_level = ?,
          prev_price = ?, prev_production_volume = ?, prev_brand_spend = ?,
          prev_capex = 0, prev_rd_upgrade_fees = 0,
          prev_credit_draw = 0, prev_credit_repay = 0,
          prev_loan_draw = 0, prev_loan_repay = 0
        WHERE company_id = ?
      `, [
                company.cash, company.accounts_receivable, company.inventory_units,
                company.fixed_assets_gross, company.accumulated_depreciation,
                company.accounts_payable, company.credit_line, company.bank_loan,
                company.retained_earnings, company.brand_equity, company.is_frozen || 0,
                company.comp_display_level, company.comp_optics_level,
                company.comp_tracking_level, company.comp_processor_level,
                company.prev_price, company.prev_production_volume, company.prev_brand_spend,
                company.company_id
            ]);
        }

        // Restore market state
        const ms = stateData.market_state;
        await runQuery(
            `UPDATE market_state SET current_quarter = ?, market_size = ?, growth_rate_percent = ? WHERE id = 1`,
            [ms.current_quarter, ms.market_size, ms.growth_rate_percent]
        );

        return NextResponse.json({ success: true, restored_to_quarter: roundId });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
