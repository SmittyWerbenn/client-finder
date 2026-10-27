import type { Category, Prospect } from './types';
import { normalizePhone } from './phone';

/**
 * Proxy Google Places API (New) — semua panggilan keluar hanya dari server.
 *
 * - Field mask minimal (hemat billing): displayName, formattedAddress, phone,
 *   websiteUri, rating, userRatingCount, googleMapsUri.
 * - Cakupan wilayah murni dari text query `"<keyword> di <kota>"`; tidak ada
 *   radius/lat-lng, jadi hasil mengikuti relevansi Google terhadap nama kota.
 * - Pagination: satu request ke API ini melakukan looping `nextPageToken`
 *   (dengan jeda ≥ 2 detik agar token aktif) sampai token habis ATAU jumlah
 *   prospek tanpa website mencapai MAX_PROSPECTS (100).
 */

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

export const PER_PAGE = 20;

/** Batas keras prospek (tanpa website) yang dikembalikan per pencarian. */
export const MAX_PROSPECTS = 100;

/**
 * Jeda sebelum memakai `nextPageToken`. Google butuh waktu agar token baru
 * valid; memanggil terlalu cepat menghasilkan `INVALID_REQUEST`.
 */
const NEXT_PAGE_DELAY_MS = 2500;

/** Pengaman agar loop tidak pernah tak berujung bila Google mengirim token terus. */
const MAX_RAW_PAGES = 10;

/** Percobaan ulang bila token halaman ditolak (`INVALID_REQUEST`). */
const PAGE_TOKEN_RETRIES = 2;

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 40;

/** Halaman mock dibuat cukup banyak agar demo bisa menyentuh plafon 100. */
const MOCK_PAGES = 8;

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
};

export class PlacesError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'PlacesError';
    this.status = status;
  }
}

export function isMockMode(): boolean {
  return !process.env.GOOGLE_PLACES_API_KEY?.trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ────────────────────────── filter & mapping ────────────────────────── */

/**
 * Filter ketat: place dianggap SUDAH punya website bila `websiteUri` berisi
 * string tidak kosong apa pun (bukan null/undefined/"").
 */
export function hasWebsite(place: GooglePlace): boolean {
  return typeof place.websiteUri === 'string' && place.websiteUri.trim() !== '';
}

export function toProspect(place: GooglePlace, category: Category): Prospect {
  const phone = normalizePhone(place.internationalPhoneNumber || place.nationalPhoneNumber || null);
  const placeId = place.id ?? `${place.displayName?.text ?? 'unknown'}-${place.formattedAddress ?? ''}`;
  return {
    placeId,
    name: place.displayName?.text?.trim() || 'Tanpa nama',
    address: place.formattedAddress?.trim() || '-',
    phoneRaw: phone?.raw ?? (place.nationalPhoneNumber || place.internationalPhoneNumber || null),
    phoneDisplay: phone?.display ?? place.nationalPhoneNumber ?? null,
    whatsapp: phone?.wa ?? null,
    website: place.websiteUri?.trim() || null,
    rating: typeof place.rating === 'number' ? Math.round(place.rating * 10) / 10 : null,
    reviews: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
    mapsUrl:
      place.googleMapsUri?.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.displayName?.text ?? ''} ${place.formattedAddress ?? ''}`.trim(),
      )}`,
    sector: category.sector,
    subCategory: category.subCategory,
    pitch: category.pitch,
  };
}

/* ────────────────────────── HTTP ke Google ────────────────────────── */

type PlacesJson = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

async function requestPlaces(
  key: string,
  fieldMask: string,
  body: Record<string, unknown>,
): Promise<PlacesJson> {
  let res: Response;
  try {
    res = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new PlacesError('Gagal menghubungi Google Places API (jaringan/DNS). Coba lagi.', 504);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let googleMessage = '';
    try {
      googleMessage = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      googleMessage = text.slice(0, 200);
    }
    const suffix = googleMessage ? ` — ${googleMessage}` : '';

    if (res.status === 400) {
      throw new PlacesError(
        `Permintaan ditolak Google Places API (400). Periksa parameter/field mask.${suffix}`,
        400,
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new PlacesError(
        `GOOGLE_PLACES_API_KEY tidak valid atau Places API (New) belum diaktifkan / billing belum aktif.${suffix}`,
        403,
      );
    }
    if (res.status === 429) {
      throw new PlacesError(`Kuota Google Places API habis atau request terlalu cepat (429).${suffix}`, 429);
    }
    throw new PlacesError(`Google Places API error ${res.status}.${suffix}`, 502);
  }

  return (await res.json()) as PlacesJson;
}

/**
 * Ambil satu halaman Text Search. Bila `pageToken` ditolak karena belum aktif
 * (`INVALID_REQUEST`), tunggu satu jeda lalu coba lagi.
 */
async function fetchPage(
  apiKey: string,
  textQuery: string,
  pageToken: string | null,
): Promise<PlacesJson> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: 'id',
    regionCode: 'ID',
    pageSize: PER_PAGE,
  };
  if (pageToken) body.pageToken = pageToken;

  let attempt = 0;
  for (;;) {
    try {
      return await requestPlaces(apiKey, SEARCH_FIELD_MASK, body);
    } catch (err) {
      const tokenNotReady =
        Boolean(pageToken) &&
        err instanceof PlacesError &&
        err.status === 400 &&
        /INVALID_REQUEST|invalid page token/i.test(err.message);
      if (!tokenNotReady || attempt >= PAGE_TOKEN_RETRIES) throw err;
      attempt += 1;
      await delay(NEXT_PAGE_DELAY_MS);
    }
  }
}

/* ────────────────────────── mock (tanpa API key) ────────────────────────── */

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

function mockPage(cacheKey: string, pageIndex: number, category: Category, city: string): GooglePlace[] {
  const rand = mulberry32(hashString(`${cacheKey}|${pageIndex}|v1`));
  const core =
    category.subCategory
      .replace(/[()]/g, '')
      .split(/[,&/]/)[0]
      .trim()
      .split(' ')
      .slice(0, 2)
      .join(' ') || 'Usaha';
  const places: GooglePlace[] = [];

  for (let i = 0; i < PER_PAGE; i += 1) {
    const seq = pageIndex * PER_PAGE + i;
    const name = `${NAME_A[Math.floor(rand() * NAME_A.length)]} ${NAME_B[Math.floor(rand() * NAME_B.length)]} ${core}`;
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const hasSite = rand() < 0.35; // ±35% sudah punya website → harus dibuang filter
    const hasPhone = rand() < 0.88;
    const prefix = ['0812', '0857', '0821', '0878', '0813'][Math.floor(rand() * 5)];
    const phone = hasPhone
      ? `${prefix}-${String(Math.floor(rand() * 9000) + 1000)}-${String(Math.floor(rand() * 9000) + 1000)}`
      : undefined;

    places.push({
      id: `mock-${hashString(`${cacheKey}-${seq}`).toString(16)}`,
      displayName: { text: name },
      formattedAddress: `${street} No. ${Math.floor(rand() * 120) + 1}, ${city}`,
      nationalPhoneNumber: phone,
      internationalPhoneNumber: phone ? phone.replace(/^0/, '+62') : undefined,
      websiteUri: hasSite ? `https://www.${name.split(' ')[0].toLowerCase()}-demo.co.id` : undefined,
      rating: Math.round((3.7 + rand() * 1.3) * 10) / 10,
      userRatingCount: Math.floor(rand() * 480) + 5,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`,
    });
  }
  return places;
}

/* ────────────────────────── pencarian utama ────────────────────────── */

export type SearchParams = {
  category: Category;
  city: string;
  refresh?: boolean;
};

export type SearchResult = {
  results: Prospect[];
  meta: {
    sector: string;
    subCategory: string;
    keyword: string;
    pitch: string;
    city: string;
    query: string;
    limit: number;
    scanned: number;
    skippedWithWebsite: number;
    totalQualified: number;
    pagesScanned: number;
    capped: boolean;
    mock: boolean;
  };
};

type SearchCore = Omit<SearchResult, 'meta'> & {
  meta: Omit<SearchResult['meta'], 'sector' | 'subCategory' | 'keyword' | 'pitch' | 'city' | 'mock'>;
};

type CacheEntry = { data: SearchCore; mock: boolean; updatedAt: number };

const globalState = globalThis as unknown as { __clientFinderSearchCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = globalState.__clientFinderSearchCache ?? new Map();
globalState.__clientFinderSearchCache = cache;

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.updatedAt > CACHE_TTL_MS) cache.delete(key);
  }
  if (cache.size > CACHE_MAX_ENTRIES) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    sorted.slice(0, cache.size - CACHE_MAX_ENTRIES).forEach(([key]) => cache.delete(key));
  }
}

/**
 * Pindai satu kota sampai habis atau sampai MAX_PROSPECTS prospek tanpa
 * website terkumpul. Tiap halaman berikutnya dipanggil lewat `nextPageToken`
 * setelah jeda NEXT_PAGE_DELAY_MS.
 */
async function scanCity(category: Category, city: string, cacheKey: string): Promise<SearchCore> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim() || '';
  const mock = !apiKey;
  const query = `${category.keyword} di ${city}`;

  const qualified: Prospect[] = [];
  let pageToken: string | null = null;
  let scanned = 0;
  let skipped = 0;
  let pagesScanned = 0;
  let capped = false;

  while (pagesScanned < MAX_RAW_PAGES) {
    // Jeda wajib sebelum memakai nextPageToken (bukan untuk halaman pertama).
    if (pagesScanned > 0 && !mock) await delay(NEXT_PAGE_DELAY_MS);

    let json: PlacesJson;
    if (mock) {
      json = {
        places: mockPage(cacheKey, pagesScanned, category, city),
        nextPageToken:
          pagesScanned + 1 < MOCK_PAGES ? `mock-token-${pagesScanned + 1}` : undefined,
      };
    } else {
      json = await fetchPage(apiKey, query, pageToken);
    }

    const raw = json.places ?? [];
    pagesScanned += 1;
    scanned += raw.length;

    for (const place of raw) {
      if (hasWebsite(place)) {
        skipped += 1;
        continue;
      }
      qualified.push(toProspect(place, category));
    }

    // Batas keras: begitu 100 prospek terkumpul, berhenti memanggil Google.
    if (qualified.length >= MAX_PROSPECTS) {
      qualified.length = MAX_PROSPECTS;
      capped = true;
      break;
    }

    pageToken = json.nextPageToken ?? null;
    if (!pageToken || raw.length === 0) break;
  }

  return {
    results: qualified,
    meta: {
      query,
      limit: MAX_PROSPECTS,
      scanned,
      skippedWithWebsite: skipped,
      totalQualified: qualified.length,
      pagesScanned,
      capped,
    },
  };
}

export async function searchProspects(params: SearchParams): Promise<SearchResult> {
  const city = params.city.trim();
  const cacheKey = `${params.category.id}|${city.toLowerCase()}`;
  const mock = !process.env.GOOGLE_PLACES_API_KEY?.trim();

  pruneCache();
  if (params.refresh) cache.delete(cacheKey);

  let entry = cache.get(cacheKey);
  if (!entry) {
    entry = { data: await scanCity(params.category, city, cacheKey), mock, updatedAt: Date.now() };
    cache.set(cacheKey, entry);
  }

  return {
    results: entry.data.results,
    meta: {
      sector: params.category.sector,
      subCategory: params.category.subCategory,
      keyword: params.category.keyword,
      pitch: params.category.pitch,
      city,
      mock: entry.mock,
      ...entry.data.meta,
    },
  };
}
