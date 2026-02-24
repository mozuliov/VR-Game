import { NextResponse } from 'next/server';
import { initDb, runQuery } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const humanCompanies = body.companies || [
      { id: 'AERO_DYNAMICS', name: 'Aero Dynamics' }
    ];

    // Check for duplicate IDs
    const ids = humanCompanies.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      return NextResponse.json({ error: "Duplicate Company IDs found. Each company must have a unique ID." }, { status: 400 });
    }

    console.log(`Initializing simulation with ${humanCompanies.length} human companies...`);

    // Drop and recreate tables
    const tables = ['companies', 'market_state', 'history_snapshots', 'shocks'];
    for (const table of tables) {
      await runQuery(`DROP TABLE IF EXISTS ${table}`);
    }

    await initDb(); // Recreate clean tables

    // 1. Reset market
    await runQuery('DELETE FROM market_state');
    await runQuery(`INSERT INTO market_state (id, current_quarter, market_size, growth_rate_percent)
      VALUES (1, 1, 10000, 7.0)`);

    // 2. Insert human players
    for (const comp of humanCompanies) {
      console.log(`Inserting company: ${comp.id}`);
      await runQuery(`
        INSERT INTO companies (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
          cash, fixed_assets_gross, shareholders_equity)
        VALUES (?, ?, 0, 1500, 2000, 5000, 500000, 200000, 700000)
      `, [comp.id, comp.name]);
    }

    // AI 1: Apex Optic
    await runQuery(`
      INSERT INTO companies
        (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
         comp_display_level, comp_optics_level, comp_tracking_level, comp_processor_level,
         brand_equity, fixed_assets_gross, shareholders_equity, cash)
      VALUES ('APEX_OPTIC', 'Apex Optic', 1, 1800, 3500, 20000, 3, 3, 3, 3, 150, 1000000, 2000000, 1000000)
    `);

    // AI 2: ValueVirtua
    await runQuery(`
      INSERT INTO companies
        (company_id, name, is_ai, prev_price, prev_production_volume, prev_brand_spend,
         comp_display_level, comp_optics_level, comp_tracking_level, comp_processor_level,
         brand_equity, fixed_assets_gross, shareholders_equity, cash)
      VALUES ('VALUE_VIRTUA', 'ValueVirtua', 1, 180, 3000, 2000, 1, 1, 1, 1, 60, 300000, 600000, 300000)
    `);

    console.log("Initialization complete.");
    return NextResponse.json({ success: true, message: `Simulation initialized with ${humanCompanies.length} human and 2 AI companies.` });
  } catch (e) {
    console.error('init error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
