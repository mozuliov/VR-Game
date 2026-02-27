import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        const { data: companies, error } = await supabase.from('companies').select('*');
        if (error) throw error;

        return NextResponse.json(companies);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
