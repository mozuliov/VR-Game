import { NextResponse } from 'next/server';
import { initDb, runQuery } from '@/lib/db';

export async function POST(req) {
  try {
    await initDb();

    // Drop and recreate tables by using DROP IF EXISTS + re-init
    await runQuery('DROP TABLE IF EXISTS companies');
    await runQuery('DROP TABLE IF EXISTS market_state');
    await runQuery('DROP TABLE IF EXISTS history_snapshots');
    await runQuery('DROP TABLE IF EXISTS shocks');
    await initDb(); // Recreate clean tables

    const body = await req.json().catch(() => ({}));
    const humanCompanies = body.companies || [
      { id: 'AERO_DYNAMICS', name: 'Aero Dynamics' }
    ];

    // 1. Reset market
    await runQuery('DELETE FROM market_state');
    await runQuery(`INSERT INTO market_state (id, current_quarter, market_size, growth_rate_percent)
      VALUES (1, 1, 10000, 7.0)`);

    // 2. Insert human players
    for (const comp of humanCompanies) {
      await runQuery(`
        INSERT INTO companies (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
          cash, fixed_assets_gross, shareholders_equity)
        VALUES (?, ?, 0, 1500, 2000, 5000, 500000, 200000, 700000)
      `, [comp.id, comp.name]);
    }

    // AI 1: Apex Optic — all Level 3, premium price.
    await runQuery(`
      INSERT INTO companies
        (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
         comp_display_level, comp_optics_level, comp_tracking_level, comp_processor_level,
         brand_equity, fixed_assets_gross, shareholders_equity, cash)
      VALUES ('APEX_OPTIC', 'Apex Optic', 1, 1800, 3500, 20000, 3, 3, 3, 3, 150, 1000000, 2000000, 1000000)
    `);

    // AI 2: ValueVirtua — all Level 1, budget price.
    await runQuery(`
      INSERT INTO companies
        (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
         comp_display_level, comp_optics_level, comp_tracking_level, comp_processor_level,
         brand_equity, fixed_assets_gross, shareholders_equity, cash)
      VALUES ('VALUE_VIRTUA', 'ValueVirtua', 1, 180, 3000, 2000, 1, 1, 1, 1, 60, 300000, 600000, 300000)
    `);

    return NextResponse.json({ success: true, message: `Simulation initialized with ${humanCompanies.length} human and 2 AI companies.` });
  } catch (e) {
    console.error('init error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
