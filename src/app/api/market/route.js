import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        const { data, error } = await supabase.from('market_state').select('*').eq('id', 1).single();
        if (error) throw error;
        return NextResponse.json(data || {});
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

        const { error } = await supabase.from('market_state').update({ growth_rate_percent }).eq('id', 1);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
