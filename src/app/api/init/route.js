import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

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

    // Clear existing data
    await supabase.from('history_snapshots').delete().neq('id', -1);
    await supabase.from('shocks').delete().neq('id', -1);
    await supabase.from('companies').delete().neq('company_id', 'dummy_id_never_matching');
    await supabase.from('market_state').delete().neq('id', -1);

    // 1. Reset market
    await supabase.from('market_state').insert([
      { id: 1, current_quarter: 1, market_size: 10000, growth_rate_percent: 7.0 }
    ]);

    // 2. Insert human players
    const humanInserts = humanCompanies.map(comp => {
      const startingCash = Number(comp.starting_cash) || 500000;
      return {
        company_id: comp.id,
        name: comp.name,
        is_ai: false,
        prev_price: 1500,
        prev_production_volume: 2000,
        prev_brand_spend: 5000,
        cash: startingCash,
        fixed_assets_gross: 200000,
        shareholders_equity: startingCash + 200000
      };
    });

    if (humanInserts.length > 0) {
      const { error: humanErr } = await supabase.from('companies').insert(humanInserts);
      if (humanErr) throw humanErr;
    }

    // AI 1: Apex Optic
    const { error: ai1Err } = await supabase.from('companies').insert([{
      company_id: 'APEX_OPTIC',
      name: 'Apex Optic',
      is_ai: true,
      prev_price: 1800,
      prev_production_volume: 3500,
      prev_brand_spend: 20000,
      comp_display_level: 3,
      comp_optics_level: 3,
      comp_tracking_level: 3,
      comp_processor_level: 3,
      brand_equity: 150,
      fixed_assets_gross: 1000000,
      shareholders_equity: 2000000,
      cash: 1000000
    }]);
    if (ai1Err) throw ai1Err;

    // AI 2: ValueVirtua
    const { error: ai2Err } = await supabase.from('companies').insert([{
      company_id: 'VALUE_VIRTUA',
      name: 'ValueVirtua',
      is_ai: true,
      prev_price: 500,
      prev_production_volume: 3000,
      prev_brand_spend: 2000,
      comp_display_level: 1,
      comp_optics_level: 1,
      comp_tracking_level: 1,
      comp_processor_level: 1,
      brand_equity: 60,
      fixed_assets_gross: 300000,
      shareholders_equity: 600000,
      cash: 300000
    }]);
    if (ai2Err) throw ai2Err;

    console.log("Initialization complete.");
    return NextResponse.json({ success: true, message: `Simulation initialized with ${humanCompanies.length} human and 2 AI companies.` });
  } catch (e) {
    console.error('init error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
