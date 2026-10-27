import type { Prospect } from './types';

/**
 * CSV untuk Excel / Google Sheets.
 * - BOM UTF-8 agar karakter Indonesia tampil benar di Excel.
 * - Escape tanda kutip ganda, koma, dan newline.
 */

const HEADERS = [
  'Nama Usaha',
  'Sub-Kategori',
  'Sektor',
  'No. Telepon',
  'WhatsApp (wa.me)',
  'Alamat Lengkap',
  'Rating',
  'Jumlah Ulasan',
  'Google Maps',
  'Pitch Angle / Rekomendasi Fitur Web',
];

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildProspectCsv(rows: Prospect[]): string {
  const lines = [HEADERS.map(escapeCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCell(r.name),
        escapeCell(r.subCategory),
        escapeCell(r.sector),
        escapeCell(r.phoneDisplay ?? ''),
        escapeCell(r.whatsapp ? `https://wa.me/${r.whatsapp}` : ''),
        escapeCell(r.address),
        escapeCell(r.rating ?? ''),
        escapeCell(r.reviews),
        escapeCell(r.mapsUrl),
        escapeCell(r.pitch),
      ].join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function csvFileName(sector?: string, city?: string): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  const parts = ['prospek'];
  if (sector) parts.push(slug(sector));
  if (city) parts.push(slug(city));
  parts.push(new Date().toISOString().slice(0, 10));
  return `${parts.filter(Boolean).join('-')}.csv`;
}
