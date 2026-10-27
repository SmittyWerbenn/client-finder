import seedLeads from '@/data/mock-leads.json';
import type { Category, Prospect } from './types';

/**
 * Generator prospek demo — deterministik per (kata kunci|kota), tanpa API key.
 * Dipakai mode "Demo / Mock Data" di dashboard.
 */

export type MockSearchInput = {
  tab: 'category' | 'name';
  category?: Category | null;
  name?: string;
  city: string;
  refresh?: boolean;
};

export type MockSearchMeta = {
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

export type MockSearchResult = { results: Prospect[]; meta: MockSearchMeta };

const MAX_PROSPECTS = 100;

type Flavor = 'fnb' | 'sport' | 'konveksi' | 'bengkel';

const FLAVOR_META: Record<Flavor, { sector: string; subCategory: string; prefixes: string[]; suffixes: string[]; pitches: string[] }> = {
  fnb: {
    sector: 'Makanan & Minuman (F&B)',
    subCategory: 'Kafe, Resto & Kedai Lokal',
    prefixes: ['Warung', 'Kedai', 'Dapur', 'Ayam', 'Bakso', 'Sate', 'Roti', 'Kopi', 'Mie', 'Nasi'],
    suffixes: ['Bu Sri', 'Pak Hadi', 'Sederhana', 'Rasa Ibu', 'Senja', 'Pagi', 'Berkah', 'Mantap', 'Kenanga', 'Jaya'],
    pitches: [
      'Katalog menu digital + tombol pesan WhatsApp agar pelanggan tidak perlu tanya harga.',
      'Landing page menu harian dan jam buka supaya mudah ditemukan dari Google.',
      'Sistem pre-order online untuk mengurangi chat berulang di jam sibuk.',
      'Galeri foto menu + paket catering kantor untuk menaikkan order rombongan.',
    ],
  },
  sport: {
    sector: 'Fasilitas Olahraga & Sewa Tempat',
    subCategory: 'Lapangan, GOR & Studio Lokal',
    prefixes: ['Arena', 'GOR', 'Lapangan', 'Sport Center', 'Club', 'Fitness', 'Padel', 'Futsal'],
    suffixes: ['Tebet', 'Kemang', 'Dago', 'Rungkut', 'Merdeka', 'Cempaka', 'Sukajadi', 'Wiyung', 'Cilandak', 'Kebayoran'],
    pitches: [
      'Booking jadwal online + pembayaran DP supaya slot kosong cepat terjual.',
      'Kalender sewa lapangan real-time, mengurangi telepon di jam sibuk.',
      'Halaman membership + jadwal kelas untuk promo trial member baru.',
      'Landing page turnamen + form pendaftaran tim antar komunitas.',
    ],
  },
  konveksi: {
    sector: 'Konveksi & Tekstil',
    subCategory: 'Konveksi, Sablon & Seragam',
    prefixes: ['Konveksi', 'Sablon', 'Jahit', 'Garment', 'Bordir', 'Percetakan'],
    suffixes: ['Berkah', 'Mandiri', 'Sejahtera', 'Kreatif', 'Cahaya', 'Prima', 'Nusantara', 'Sentosa', 'Andalan', 'Maju'],
    pitches: [
      'Katalog bahan + form permintaan penawaran (RFQ) agar order B2B masuk otomatis.',
      'Galeri hasil produksi + kalkulator harga satuan untuk mempercepat closing.',
      'Portfolio klien korporat + form order untuk membangun kepercayaan pembeli baru.',
      'Halaman paket order (satuan, lusinan, grosir) supaya sales tidak kirim PDF manual.',
    ],
  },
  bengkel: {
    sector: 'Otomotif & Bengkel',
    subCategory: 'Bengkel Motor & Mobil',
    prefixes: ['Bengkel', 'Servis', 'Motor', 'Mobil', 'Auto', 'Garasi'],
    suffixes: ['Jaya', 'Abadi', 'Rejeki', 'Mandiri', 'Cepat', 'Sahabat', 'Utama', 'Pratama', 'Setia', 'Makmur'],
    pitches: [
      'Halaman layanan + booking servis supaya pelanggan bisa pilih slot tanpa antre.',
      'Estimasi biaya servis + form booking, transparansi harga menarik pelanggan baru.',
      'Katalog sparepart & paket servis berkala untuk pelanggan langganan.',
      'Landing page panggilan darurat (towing/roadside) dengan tombol WhatsApp langsung.',
    ],
  },
};

const STREETS = ['Jl. Melati', 'Jl. Kenanga', 'Jl. Merdeka', 'Jl. Ahmad Yani', 'Jl. Diponegoro', 'Jl. Cendrawasih', 'Jl. Anggrek', 'Jl. Karya Bakti', 'Jl. Raya Utama'];
const DISTRICTS: Record<string, string[]> = {
  'jakarta selatan': ['Tebet', 'Kemang', 'Cilandak', 'Pasar Minggu', 'Kebayoran Baru'],
  'jakarta pusat': ['Menteng', 'Cikini', 'Tanah Abang', 'Kemayoran'],
  jakarta: ['Tebet', 'Kemang', 'Kelapa Gading', 'Kebon Jeruk', 'Cilandak'],
  bandung: ['Dago', 'Cihampelas', 'Buah Batu', 'Antapani', 'Cigondewah'],
  surabaya: ['Rungkut', 'Jemursari', 'Gubeng', 'Wiyung', 'Kenjeran'],
  cimahi: ['Baros', 'Cimahi Tengah', 'Leuwigajah'],
};
const PHONE_PREFIXES = ['812', '813', '815', '857', '878', '895', '822', '852'];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

function flavorFor(text: string): Flavor {
  const value = text.toLowerCase();
  if (/(padel|futsal|badminton|yoga|gym|senam|sport|olahraga|lapangan|gor|renang)/.test(value)) return 'sport';
  if (/(konveksi|sablon|jahit|seragam|bordir|garment|kaos|tekstil)/.test(value)) return 'konveksi';
  if (/(bengkel|motor|mobil|servis|otomotif|sparepart|towing)/.test(value)) return 'bengkel';
  return 'fnb';
}

function districtsFor(city: string): string[] {
  return DISTRICTS[city.trim().toLowerCase()] ?? ['Pusat Kota', 'Utara', 'Selatan', 'Timur', 'Barat'];
}

function phoneFor(rng: () => number): { raw: string; display: string } {
  const prefix = pick(rng, PHONE_PREFIXES);
  let rest = '';
  for (let i = 0; i < 8; i += 1) rest += Math.floor(rng() * 10);
  const raw = `62${prefix}${rest}`;
  const local = `0${prefix}${rest}`;
  const display = `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
  return { raw, display };
}

function buildLead(
  rng: () => number,
  index: number,
  name: string,
  city: string,
  flavor: Flavor,
  fallbackPitch: string,
  subCategory: string,
): { lead: Prospect; hasWebsite: boolean } {
  const district = pick(rng, districtsFor(city));
  const street = pick(rng, STREETS);
  const number = 1 + Math.floor(rng() * 180);
  const address = `${street} No. ${number}, ${district}, ${city}`;
  const rating = rng() < 0.06 ? null : Math.round((3.2 + rng() * 1.8) * 10) / 10;
  const reviews = 3 + Math.floor(Math.pow(rng(), 2) * 620);
  const hasPhone = rng() < 0.9;
  const phone = hasPhone ? phoneFor(rng) : null;
  const hasWebsite = rng() < 0.28;
  const pitch = rng() < 0.55 ? fallbackPitch : pick(rng, FLAVOR_META[flavor].pitches);
  const placeId = `demo-${hashString(`${name}|${address}|${index}`).toString(36)}`;

  return {
    hasWebsite,
    lead: {
      placeId,
      name,
      address,
      city,
      phoneRaw: phone?.raw ?? null,
      phoneDisplay: phone?.display ?? null,
      whatsapp: phone?.raw ?? null,
      website: hasWebsite ? `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.id` : null,
      rating,
      reviews,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`,
      sector: FLAVOR_META[flavor].sector,
      subCategory,
      pitch,
    },
  };
}

function seedMatches(
  lead: (typeof seedLeads)[number],
  city: string,
  tab: 'category' | 'name',
  text: string,
  flavor: Flavor,
): boolean {
  if (tab === 'name') {
    const tokens = text.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
    const haystack = `${lead.name} ${lead.subCategory} ${lead.address}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  }
  const seedFlavor = flavorFor(`${lead.sector} ${lead.subCategory}`);
  if (seedFlavor !== flavor) return false;
  return lead.city.toLowerCase() === city.trim().toLowerCase();
}

function fromSeed(lead: (typeof seedLeads)[number], sector: string, subCategory: string): Prospect {
  return {
    placeId: lead.placeId,
    name: lead.name,
    address: lead.address,
    city: lead.city,
    phoneRaw: lead.phoneRaw,
    phoneDisplay: lead.phoneDisplay,
    whatsapp: lead.whatsapp,
    website: lead.website,
    rating: lead.rating,
    reviews: lead.reviews,
    mapsUrl: lead.mapsUrl,
    sector,
    subCategory,
    pitch: lead.pitch,
  };
}

export function mockSearch(input: MockSearchInput): MockSearchResult {
  const city = input.city.trim();
  const tab = input.tab;
  const keyword = tab === 'name' ? (input.name ?? '').trim() : (input.category?.keyword ?? 'usaha lokal');
  const query = `${keyword} di ${city}`;
  const flavor = flavorFor(`${keyword} ${input.category?.sector ?? ''}`);
  const sector = input.category?.sector ?? FLAVOR_META[flavor].sector;
  const subCategory = input.category?.subCategory ?? FLAVOR_META[flavor].subCategory;
  const fallbackPitch = input.category?.pitch ?? FLAVOR_META[flavor].pitches[0];
  const rng = createRng(hashString(`${query.toLowerCase()}|${input.refresh ? Date.now() : 'stable'}`));

  const results: Prospect[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  let skippedWithWebsite = 0;

  const push = (lead: Prospect, hasWebsite: boolean) => {
    scanned += 1;
    if (hasWebsite || lead.website) {
      skippedWithWebsite += 1;
      return;
    }
    if (seen.has(lead.placeId)) return;
    seen.add(lead.placeId);
    if (results.length < MAX_PROSPECTS) results.push(lead);
  };

  // 1) Seed lokal siap pakai (15 bisnis F&B, olahraga, konveksi, bengkel).
  for (const seed of seedLeads) {
    if (results.length >= MAX_PROSPECTS) break;
    if (!seedMatches(seed, city, tab, keyword, flavor)) continue;
    push(fromSeed(seed, seed.sector, seed.subCategory), Boolean(seed.website));
  }

  // 2) Prospek generated mengikuti kota + kata kunci.
  const usedNames = new Set(results.map((lead) => lead.name.toLowerCase()));
  const count = tab === 'name' ? 34 : 150;
  for (let i = 0; i < count && results.length < MAX_PROSPECTS; i += 1) {
    const baseName = tab === 'name'
      ? `${keyword} ${pick(rng, districtsFor(city))}${i % 3 === 0 ? ` Cabang ${i + 1}` : ''}`
      : `${pick(rng, FLAVOR_META[flavor].prefixes)} ${pick(rng, FLAVOR_META[flavor].suffixes)}${i % 4 === 0 ? ` ${pick(rng, districtsFor(city))}` : ''}`;
    if (usedNames.has(baseName.toLowerCase())) continue;
    usedNames.add(baseName.toLowerCase());
    const { lead, hasWebsite } = buildLead(rng, i, baseName, city, flavor, fallbackPitch, subCategory);
    push(lead, hasWebsite);
  }

  return {
    results,
    meta: {
      sector,
      subCategory,
      keyword,
      pitch: fallbackPitch,
      city,
      query,
      limit: MAX_PROSPECTS,
      scanned,
      skippedWithWebsite,
      totalQualified: results.length,
      pagesScanned: Math.max(1, Math.ceil(scanned / 20)),
      capped: results.length >= MAX_PROSPECTS,
      mock: true,
    },
  };
}

export function demoScanLeads(): Prospect[] {
  return seedLeads.map((lead) => fromSeed(lead, lead.sector, lead.subCategory));
}
