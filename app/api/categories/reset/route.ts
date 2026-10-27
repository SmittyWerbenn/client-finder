import { NextResponse } from 'next/server';
import { listCategories, resetCategoriesToDefault } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  await resetCategoriesToDefault();
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}
