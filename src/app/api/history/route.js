import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET all history snapshots (summary list)
export async function GET() {
    try {
        const { data: snapshots, error } = await supabase
            .from('history_snapshots')
            .select('id, round_id, timestamp, timeline_status')
            .order('round_id', { ascending: true });

        if (error) throw error;
        return NextResponse.json(snapshots);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
