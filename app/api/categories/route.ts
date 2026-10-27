import { NextResponse } from 'next/server';
import { createCategory, listCategories, ValidationError } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const category = await createCategory(body);
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error('[categories:POST]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan kategori.' }, { status: 500 });
  }
}
