import { NextResponse } from 'next/server';
import { getQuery, runQuery } from '@/lib/db';
import { RD_UPGRADE_FEE } from '@/lib/engine/constants';

// Fetch a single company by ID
export async function GET(request, { params }) {
    try {
        const id = (await params).id;
        const company = await getQuery('SELECT * FROM companies WHERE company_id = ?', [id]);
        if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        return NextResponse.json(company);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Submit full company decisions for next quarter

export async function PUT(request, { params }) {
    try {
        const id = (await params).id;
        const body = await request.json();

        const {
            price,
            production_volume,
            brand_spend,
            capex,
            upgrade_display,
            upgrade_optics,
            upgrade_tracking,
            upgrade_processor,
            credit_draw,
            credit_repay,
            loan_draw,
            loan_repay,
        } = body;

        const company = await getQuery('SELECT * FROM companies WHERE company_id = ?', [id]);
        if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

        // Process R&D upgrades (they take effect immediately on the NEXT quarter - the lag rule is
        // applied in the engine. Here we just validate and set the new level.)
        let display = company.comp_display_level;
        let optics = company.comp_optics_level;
        let tracking = company.comp_tracking_level;
        let processor = company.comp_processor_level;
        let rdFee = 0;

        if (upgrade_display && display < 3) { display += 1; rdFee += RD_UPGRADE_FEE; }
        if (upgrade_optics && optics < 3) { optics += 1; rdFee += RD_UPGRADE_FEE; }
        if (upgrade_tracking && tracking < 3) { tracking += 1; rdFee += RD_UPGRADE_FEE; }
        if (upgrade_processor && processor < 3) { processor += 1; rdFee += RD_UPGRADE_FEE; }

        await runQuery(`
      UPDATE companies SET
        prev_price = ?,
        prev_production_volume = ?,
        prev_brand_spend = ?,
        prev_capex = ?,
        prev_rd_upgrade_fees = ?,
        prev_credit_draw = ?,
        prev_credit_repay = ?,
        prev_loan_draw = ?,
        prev_loan_repay = ?,
        comp_display_level = ?,
        comp_optics_level = ?,
        comp_tracking_level = ?,
        comp_processor_level = ?
      WHERE company_id = ?
    `, [
            price, production_volume, brand_spend,
            capex || 0, rdFee,
            credit_draw || 0, credit_repay || 0,
            loan_draw || 0, loan_repay || 0,
            display, optics, tracking, processor,
            id
        ]);

        return NextResponse.json({ success: true, rd_fee_total: rdFee });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
