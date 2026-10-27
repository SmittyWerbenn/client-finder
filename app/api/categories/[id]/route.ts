import { NextResponse } from 'next/server';
import {
  NotFoundError,
  ValidationError,
  deleteCategory,
  getCategory,
  updateCategory,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) return NextResponse.json({ ok: false, error: 'Kategori tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ ok: true, category });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await req.json();
    const category = await updateCategory(id, body);
    return NextResponse.json({ ok: true, category });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error('[categories:PUT]', err);
    return NextResponse.json({ ok: false, error: 'Gagal memperbarui kategori.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 404 });
    }
    console.error('[categories:DELETE]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus kategori.' }, { status: 500 });
  }
}
