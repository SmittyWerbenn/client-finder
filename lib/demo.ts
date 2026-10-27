import { buildProspectCsv, csvFileName } from './csv';
import { normalizePhone } from './phone';
import { DEFAULT_CATEGORIES } from './seed';
import type { Category, Prospect, SearchMeta } from './types';

/**
 * Mode demo statis untuk GitHub Pages.
 *
 * Pages hanya bisa menyajikan file statis, sedangkan aplikasi penuh butuh
 * Node runtime (route handler `/api/*`, cookie sesi, store JSON). Saat
 * `NEXT_PUBLIC_DEMO=1` dashboard memakai generator lokal ini sebagai ganti
 * panggilan API, sehingga UI, filter "tanpa website", dan export CSV bisa
 * dicoba langsung di Pages tanpa server.
 *
 * Data yang dihasilkan deterministik (seed dari kategori + kota) dan tidak
 * pernah menyentuh Google Places.
 */

export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

/** Plafon prospek tanpa website — sama dengan server (`lib/places.ts`). */
export const DEMO_LIMIT = 100;
const PER_PAGE = 20;
const DEMO_PAGES = 8;
const WITH_WEBSITE_RATIO = 0.35;

const NAME_A = [
  'Arena', 'Graha', 'Sentra', 'Bintang', 'Prima', 'Maju', 'Anugerah', 'Cahaya',
  'Rizky', 'Karya', 'Sinar', 'Mekar', 'Tunas', 'Berkah', 'Mulia', 'Sahabat',
  'Mitra', 'Bumi', 'Cendana', 'Aneka',
];
const NAME_B = ['Jaya', 'Abadi', 'Mandiri', 'Sejahtera', 'Utama', 'Makmur', 'Pratama', 'Nusantara', 'Asri', 'Lestari'];
const STREETS = [
  'Jl. Merdeka', 'Jl. Sudirman', 'Jl. Ahmad Yani', 'Jl. Diponegoro', 'Jl. Gatot Subroto',
  'Jl. Raya Bogor', 'Jl. Pahlawan', 'Jl. Melati', 'Jl. Kenanga', 'Jl. Cendrawasih',
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kategori seed yang dipakai dashboard saat mode demo (tanpa DB). */
export function demoCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
}

function demoPage(cacheKey: string, pageIndex: number, category: Category, city: string): Prospect[] {
  const rand = mulberry32(hashString(`${cacheKey}|${pageIndex}|demo`));
  const core =
    category.subCategory
      .replace(/[()]/g, '')
      .split(/[,&/]/)[0]
      .trim()
      .split(' ')
      .slice(0, 2)
      .join(' ') || 'Usaha';
  const rows: Prospect[] = [];

  for (let i = 0; i < PER_PAGE; i += 1) {
    const seq = pageIndex * PER_PAGE + i;
    const name = `${NAME_A[Math.floor(rand() * NAME_A.length)]} ${NAME_B[Math.floor(rand() * NAME_B.length)]} ${core}`;
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const hasSite = rand() < WITH_WEBSITE_RATIO;
    const hasPhone = rand() < 0.88;
    const prefix = ['0812', '0857', '0821', '0878', '0813'][Math.floor(rand() * 5)];
    const phone = hasPhone
      ? `${prefix}-${String(Math.floor(rand() * 9000) + 1000)}-${String(Math.floor(rand() * 9000) + 1000)}`
      : null;
    const normalized = normalizePhone(phone);

    rows.push({
      placeId: `demo-${hashString(`${cacheKey}-${seq}`).toString(16)}`,
      name,
      address: `${street} No. ${Math.floor(rand() * 120) + 1}, ${city}`,
      phoneRaw: phone,
      phoneDisplay: normalized?.display ?? phone,
      whatsapp: normalized?.wa ?? null,
      // Hanya prospek tanpa website yang lolos — sama seperti filter server.
      website: hasSite ? `https://www.${name.split(' ')[0].toLowerCase()}-demo.co.id` : null,
      rating: Math.round((3.7 + rand() * 1.3) * 10) / 10,
      reviews: Math.floor(rand() * 480) + 5,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`,
      sector: category.sector,
      subCategory: category.subCategory,
      pitch: category.pitch,
    });
  }
  return rows;
}

export type DemoSearchResult = { results: Prospect[]; meta: SearchMeta };

/**
 * Meniru `searchProspects()` server: pindai halaman demo, buang yang punya
 * website, berhenti saat 100 prospek terkumpul atau halaman habis.
 */
export function demoSearch(category: Category, city: string, refresh = false): DemoSearchResult {
  const cacheKey = `${category.id}|${city}|${refresh ? Date.now() : 'demo'}`;
  const qualified: Prospect[] = [];
  let scanned = 0;
  let skippedWithWebsite = 0;
  let pagesScanned = 0;

  for (let page = 0; page < DEMO_PAGES && qualified.length < DEMO_LIMIT; page += 1) {
    pagesScanned += 1;
    for (const row of demoPage(cacheKey, page, category, city)) {
      scanned += 1;
      if (row.website) {
        skippedWithWebsite += 1;
        continue;
      }
      if (qualified.length >= DEMO_LIMIT) break;
      qualified.push(row);
    }
  }

  const meta: SearchMeta = {
    sector: category.sector,
    subCategory: category.subCategory,
    keyword: category.keyword,
    pitch: category.pitch,
    city,
    query: `${category.keyword} di ${city}`,
    limit: DEMO_LIMIT,
    scanned,
    skippedWithWebsite,
    totalQualified: qualified.length,
    pagesScanned,
    capped: qualified.length >= DEMO_LIMIT,
    mock: true,
  };

  return { results: qualified, meta };
}

/** CSV dibuat di browser memakai builder yang sama dengan server. */
export function demoCsv(rows: Prospect[], sector: string | undefined, city: string): {
  csv: string;
  fileName: string;
} {
  return { csv: buildProspectCsv(rows), fileName: csvFileName(sector, city) };
}
