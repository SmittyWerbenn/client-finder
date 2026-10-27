import { NextResponse } from 'next/server';
import { getCategory } from '@/lib/db';
import { PlacesError, searchProspects } from '@/lib/places';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SearchBody = {
  categoryId?: unknown;
  name?: unknown;
  city?: unknown;
  refresh?: unknown;
};

export async function POST(req: Request) {
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Body request tidak valid (harus JSON).' }, { status: 400 });
  }

  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';

  if (!categoryId && name.length < 2) {
    return NextResponse.json({ ok: false, error: 'Pilih kategori usaha atau isi nama usaha (min. 2 karakter).' }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ ok: false, error: 'Nama usaha terlalu panjang (maks. 80 karakter).' }, { status: 400 });
  }
  if (city.length < 2) {
    return NextResponse.json({ ok: false, error: 'Kota / wilayah wajib diisi (min. 2 karakter).' }, { status: 400 });
  }
  if (city.length > 80) {
    return NextResponse.json({ ok: false, error: 'Nama kota terlalu panjang (maks. 80 karakter).' }, { status: 400 });
  }

  let category = name ? null : await getCategory(categoryId);
  if (name) {
    // Pencarian langsung nama usaha: Text Search memakai nama sebagai keyword.
    const now = new Date().toISOString();
    category = {
      id: `direct-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      sector: 'Pencarian Langsung',
      subCategory: name,
      keyword: name,
      pitch: 'Website profil usaha + katalog produk dan tombol WhatsApp agar calon pelanggan langsung menemukan info resmi.',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
  }
  if (!category) {
    return NextResponse.json({ ok: false, error: 'Kategori tidak ditemukan / sudah dihapus.' }, { status: 404 });
  }

  try {
    const { results, meta } = await searchProspects({
      category,
      city,
      refresh: body.refresh === true,
    });

    return NextResponse.json({ ok: true, meta, results });
  } catch (err) {
    if (err instanceof PlacesError) {
      return NextResponse.json({ ok: false, error: err.message, code: 'PLACES_API_ERROR' }, { status: err.status });
    }
    console.error('[search:POST]', err);
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan di server saat mengambil data prospek.' },
      { status: 500 },
    );
  }
}
