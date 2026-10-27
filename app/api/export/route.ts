import { NextResponse } from 'next/server';
import { buildProspectCsv, csvFileName } from '@/lib/csv';
import { normalizePhone } from '@/lib/phone';
import type { Prospect } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ExportBody = { rows?: unknown; sector?: unknown; city?: unknown };

function sanitizeRows(input: unknown): Prospect[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 2000).map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const phone = normalizePhone(
      typeof row.phoneRaw === 'string'
        ? row.phoneRaw
        : typeof row.phoneDisplay === 'string'
          ? row.phoneDisplay
          : null,
    );
    return {
      placeId: String(row.placeId ?? ''),
      name: String(row.name ?? ''),
      address: String(row.address ?? ''),
      phoneRaw: typeof row.phoneRaw === 'string' ? row.phoneRaw : null,
      phoneDisplay: phone?.display ?? (typeof row.phoneDisplay === 'string' ? row.phoneDisplay : null),
      whatsapp: phone?.wa ?? (typeof row.whatsapp === 'string' ? row.whatsapp : null),
      website: typeof row.website === 'string' ? row.website : null,
      rating: typeof row.rating === 'number' ? row.rating : null,
      reviews: typeof row.reviews === 'number' ? row.reviews : 0,
      mapsUrl: String(row.mapsUrl ?? ''),
      sector: String(row.sector ?? ''),
      subCategory: String(row.subCategory ?? ''),
      pitch: String(row.pitch ?? ''),
    } satisfies Prospect;
  });
}

export async function POST(req: Request) {
  let body: ExportBody;
  try {
    body = (await req.json()) as ExportBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Body request tidak valid.' }, { status: 400 });
  }

  const rows = sanitizeRows(body.rows);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'Tidak ada data prospek untuk diexport.' }, { status: 400 });
  }

  const csv = buildProspectCsv(rows);
  const filename = csvFileName(
    typeof body.sector === 'string' ? body.sector : undefined,
    typeof body.city === 'string' ? body.city : undefined,
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
