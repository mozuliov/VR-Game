import { NextResponse } from 'next/server';
import { allQuery } from '@/lib/db';

export async function GET() {
    try {
        const companies = await allQuery('SELECT * FROM companies');
        return NextResponse.json(companies);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
