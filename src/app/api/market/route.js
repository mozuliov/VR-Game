import { NextResponse } from 'next/server';
import { getQuery, runQuery } from '@/lib/db';

export async function GET() {
    try {
        const state = await getQuery('SELECT * FROM market_state WHERE id = 1');
        return NextResponse.json(state || {});
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== 'Bearer silicon_master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { growth_rate_percent } = body;
        await runQuery('UPDATE market_state SET growth_rate_percent = ? WHERE id = 1', [growth_rate_percent]);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
