import { NextResponse } from 'next/server';
import { allQuery, runQuery } from '@/lib/db';

// GET all history snapshots (summary list)
export async function GET() {
    try {
        const snapshots = await allQuery(
            `SELECT id, round_id, timestamp, timeline_status FROM history_snapshots ORDER BY round_id ASC`
        );
        return NextResponse.json(snapshots);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
