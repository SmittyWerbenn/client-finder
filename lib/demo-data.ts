import { DEFAULT_CATEGORIES } from './seed';
import type { SessionUser } from './auth';
import type { Category, Lead, LeadStatus, PublicUser, UsageLogEntry, UsageOverview, UsageSnapshot } from './types';

/**
 * Data dummy untuk mode demo interaktif (`/console?mode=demo`).
 *
 * Modul ini murni data + fungsi deterministik: tidak menyentuh database,
 * Google Places API, maupun `next/headers`, sehingga aman diimpor dari
 * komponen client (mock API) dan server component (render awal).
 */

export type DemoLead = Lead & { categoryId: string };

const CATALOG_CREATED = '2026-09-01T08:00:00.000Z';

export const DEMO_USER: SessionUser = {
  id: 'demo-visitor',
  email: 'demo@clientfinder.id',
  name: 'Demo Visitor',
  role: 'SUPERADMIN',
};

export const DEMO_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((category) => ({
  ...category,
  ownerId: null,
  ownerName: null,
  isGlobal: true,
  createdAt: CATALOG_CREATED,
  updatedAt: CATALOG_CREATED,
}));

const CATEGORY_BY_ID = new Map(DEMO_CATEGORIES.map((category) => [category.id, category]));

function displayPhone(raw: string): string {
  if (raw.length < 10) return raw;
  return `+${raw.slice(0, 2)} ${raw.slice(2, 5)}-${raw.slice(5, 9)}-${raw.slice(9)}`;
}

type Seed = {
  id: string;
  categoryId: string;
  name: string;
  area: string;
  city: string;
  phone: string;
  rating: number;
  reviews: number;
  status: LeadStatus;
};

const SEEDS: Seed[] = [
  { id: 'dl-01', categoryId: 'padel-futsal-badminton', name: 'Padel Arena Buah Batu', area: 'Buah Batu', city: 'Kota Bandung', phone: '6281222011177', rating: 4.6, reviews: 128, status: 'Interested' },
  { id: 'dl-02', categoryId: 'padel-futsal-badminton', name: 'Futsal Kingdom Margonda', area: 'Margonda', city: 'Kota Depok', phone: '6281388944120', rating: 4.4, reviews: 76, status: 'New' },
  { id: 'dl-03', categoryId: 'padel-futsal-badminton', name: 'GOR Badminton Smash Center', area: 'Jatiasih', city: 'Kota Bekasi', phone: '6281299003451', rating: 4.3, reviews: 54, status: 'Contacted' },
  { id: 'dl-04', categoryId: 'studio-senam-yoga-gym', name: 'Yoga Studio Savasana', area: 'Sinduadi', city: 'Kab. Sleman', phone: '6281122345678', rating: 4.8, reviews: 91, status: 'New' },
  { id: 'dl-05', categoryId: 'studio-senam-yoga-gym', name: 'Gym Fit Factory', area: 'Galaxy', city: 'Kota Bekasi', phone: '6281577800213', rating: 4.2, reviews: 143, status: 'Interested' },
  { id: 'dl-06', categoryId: 'ruang-acara-creative-space', name: 'Kreativa Space Kemang', area: 'Kemang', city: 'Jakarta Selatan', phone: '6281808900124', rating: 4.7, reviews: 47, status: 'Closed' },
  { id: 'dl-07', categoryId: 'restoran-keluarga-kafe-event', name: 'Kopi Rindu Senja', area: 'Dago', city: 'Kota Bandung', phone: '6281366778812', rating: 4.5, reviews: 312, status: 'Interested' },
  { id: 'dl-08', categoryId: 'restoran-keluarga-kafe-event', name: 'Warung Sunda Cibiuk', area: 'Harapan Indah', city: 'Kota Bekasi', phone: '6281299887711', rating: 4.4, reviews: 208, status: 'New' },
  { id: 'dl-09', categoryId: 'restoran-keluarga-kafe-event', name: 'Kafe Teras Kayu', area: 'Banyumanik', city: 'Kota Semarang', phone: '6281222556690', rating: 4.6, reviews: 164, status: 'Contacted' },
  { id: 'dl-10', categoryId: 'catering-pernikahan-nasi-box', name: 'Dapur Bu Siti Catering', area: 'Rungkut', city: 'Kota Surabaya', phone: '6281233445566', rating: 4.7, reviews: 87, status: 'Interested' },
  { id: 'dl-11', categoryId: 'catering-pernikahan-nasi-box', name: 'Nasi Box Berkah Jaya', area: 'Setiabudi', city: 'Kota Medan', phone: '6281377009912', rating: 4.3, reviews: 62, status: 'New' },
  { id: 'dl-12', categoryId: 'resto-produk-kemasan', name: 'Sambal Nusantara Bu Rini', area: 'Gubeng', city: 'Kota Surabaya', phone: '6281255887733', rating: 4.8, reviews: 129, status: 'Closed' },
  { id: 'dl-13', categoryId: 'toko-mebel-furniture', name: 'Jati Asri Furniture', area: 'Pedurungan', city: 'Kota Semarang', phone: '6281244556621', rating: 4.5, reviews: 73, status: 'New' },
  { id: 'dl-14', categoryId: 'toko-bahan-bangunan-besi', name: 'Toko Besi Sumber Rejeki', area: 'Cikarang', city: 'Kab. Bekasi', phone: '6281311882200', rating: 4.1, reviews: 38, status: 'Contacted' },
  { id: 'dl-15', categoryId: 'florist-toko-buket', name: 'Buket Bunga Rania', area: 'Antapani', city: 'Kota Bandung', phone: '6281277334455', rating: 4.9, reviews: 156, status: 'New' },
  { id: 'dl-16', categoryId: 'konveksi-sablon-merchandise', name: 'Konveksi Sablon Kaos Kita', area: 'Cimahi', city: 'Kota Cimahi', phone: '6281322667788', rating: 4.4, reviews: 64, status: 'Interested' },
  { id: 'dl-17', categoryId: 'bengkel-detailing-carwash', name: 'Bengkel Auto Detailing Kilat', area: 'Wonokromo', city: 'Kota Surabaya', phone: '6281288990022', rating: 4.6, reviews: 112, status: 'New' },
  { id: 'dl-18', categoryId: 'klinik-hewan-pet-care', name: 'Klinik Hewan Paw Care', area: 'Renon', city: 'Kota Denpasar', phone: '6281333778899', rating: 4.7, reviews: 95, status: 'Contacted' },
];

export const DEMO_LEADS: DemoLead[] = SEEDS.map((seed) => {
  const category = CATEGORY_BY_ID.get(seed.categoryId);
  const sector = category?.sector ?? 'Tanpa sektor';
  const subCategory = category?.subCategory ?? 'Tanpa sub-kategori';
  return {
    id: seed.id,
    categoryId: seed.categoryId,
    ownerId: DEMO_USER.id,
    ownerName: DEMO_USER.name,
    placeId: `demo-${seed.id}`,
    name: seed.name,
    address: `${seed.area}, ${seed.city}`,
    city: seed.city,
    phoneRaw: seed.phone,
    phoneDisplay: displayPhone(seed.phone),
    whatsapp: seed.phone,
    website: null,
    rating: seed.rating,
    reviews: seed.reviews,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${seed.name} ${seed.city}`)}`,
    sector,
    subCategory,
    pitch: category?.pitch ?? 'Website profil + katalog digital untuk mempercepat calon pelanggan menghubungi bisnis.',
    status: seed.status,
    source: 'SEARCH',
  };
});

export function demoPeriod(): string {
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export const DEMO_USAGE: UsageSnapshot = {
  period: demoPeriod(),
  userHits: 37,
  userLimit: 100,
  globalHits: 268,
  globalLimit: 1000,
};

export const DEMO_USERS: PublicUser[] = [
  { id: DEMO_USER.id, email: 'demo@clientfinder.id', name: 'Demo Visitor', role: 'SUPERADMIN', isActive: true, createdAt: CATALOG_CREATED, leads: 18 },
  { id: 'usr-02', email: 'owner@agencypro.id', name: 'Rangga Pratama', role: 'ADMIN', isActive: true, createdAt: '2026-09-12T03:10:00.000Z', leads: 74 },
  { id: 'usr-03', email: 'sari@digitalnusa.co', name: 'Sari Wulandari', role: 'USER', isActive: true, createdAt: '2026-09-20T06:45:00.000Z', leads: 31 },
  { id: 'usr-04', email: 'budi@webstudio.id', name: 'Budi Santoso', role: 'USER', isActive: false, createdAt: '2026-09-25T09:20:00.000Z', leads: 12 },
];

function isoDaysAgo(days: number, hour = 9, minute = 15): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildDaily(): Array<{ date: string; hits: number }> {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    // Pola deterministik supaya grafik demo terlihat wajar (bukan acak).
    const hits = [12, 18, 9, 24, 31, 6, 15, 22, 27, 11][index % 10] + (index % 4) * 3;
    return { date: key, hits };
  });
}

const DEMO_LOGS: UsageLogEntry[] = [
  { id: 'log-01', userId: DEMO_USER.id, userName: 'Demo Visitor', userEmail: 'demo@clientfinder.id', endpoint: 'TEXT_SEARCH', queryParam: 'lapangan padel futsal badminton di Kota Bandung', status: 'SUCCESS', httpStatus: 200, placeId: null, durationMs: 812, createdAt: isoDaysAgo(0, 10, 12) },
  { id: 'log-02', userId: DEMO_USER.id, userName: 'Demo Visitor', userEmail: 'demo@clientfinder.id', endpoint: 'PLACE_DETAILS', queryParam: 'Padel Arena Buah Batu', status: 'SUCCESS', httpStatus: 200, placeId: 'demo-dl-01', durationMs: 214, createdAt: isoDaysAgo(0, 10, 12) },
  { id: 'log-03', userId: 'usr-02', userName: 'Rangga Pratama', userEmail: 'owner@agencypro.id', endpoint: 'TEXT_SEARCH', queryParam: 'restoran keluarga kafe di Kota Surabaya', status: 'SUCCESS', httpStatus: 200, placeId: null, durationMs: 967, createdAt: isoDaysAgo(1, 14, 5) },
  { id: 'log-04', userId: 'usr-02', userName: 'Rangga Pratama', userEmail: 'owner@agencypro.id', endpoint: 'PLACE_DETAILS', queryParam: 'Kopi Rindu Senja', status: 'ERROR', httpStatus: 429, placeId: 'demo-dl-07', durationMs: 142, createdAt: isoDaysAgo(1, 14, 7) },
  { id: 'log-05', userId: 'usr-03', userName: 'Sari Wulandari', userEmail: 'sari@digitalnusa.co', endpoint: 'TEXT_SEARCH', queryParam: 'toko bahan bangunan besi di Kab. Bekasi', status: 'SUCCESS', httpStatus: 200, placeId: null, durationMs: 903, createdAt: isoDaysAgo(2, 11, 40) },
  { id: 'log-06', userId: 'usr-03', userName: 'Sari Wulandari', userEmail: 'sari@digitalnusa.co', endpoint: 'PLACE_DETAILS', queryParam: 'Toko Besi Sumber Rejeki', status: 'SUCCESS', httpStatus: 200, placeId: 'demo-dl-14', durationMs: 187, createdAt: isoDaysAgo(2, 11, 41) },
  { id: 'log-07', userId: 'usr-02', userName: 'Rangga Pratama', userEmail: 'owner@agencypro.id', endpoint: 'TEXT_SEARCH', queryParam: 'konveksi sablon merchandise di Kota Cimahi', status: 'ERROR', httpStatus: 500, placeId: null, durationMs: 1240, createdAt: isoDaysAgo(4, 9, 2) },
  { id: 'log-08', userId: DEMO_USER.id, userName: 'Demo Visitor', userEmail: 'demo@clientfinder.id', endpoint: 'TEXT_SEARCH', queryParam: 'klinik hewan pet shop grooming di Kota Denpasar', status: 'SUCCESS', httpStatus: 200, placeId: null, durationMs: 734, createdAt: isoDaysAgo(5, 16, 30) },
];

export const DEMO_OVERVIEW: UsageOverview = {
  period: demoPeriod(),
  globalHits: 268,
  globalLimit: 1000,
  perUser: DEMO_USERS.map((user, index) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hits: [37, 121, 84, 26][index] ?? 10,
  })),
  daily: buildDaily(),
  logs: DEMO_LOGS,
  totalUsers: DEMO_USERS.length,
};

/** Hitungan status lead dummy untuk header Database Leads. */
export function demoLeadCounts(): Record<LeadStatus | 'all', number> {
  const counts: Record<LeadStatus | 'all', number> = { all: 0, New: 0, Contacted: 0, Interested: 0, Closed: 0 };
  for (const lead of DEMO_LEADS) {
    counts[lead.status] += 1;
    counts.all += 1;
  }
  return counts;
}

/** Daftar pasangan sektor/sub-kategori untuk filter Database Leads. */
export function demoLeadFacets(): Array<{ sector: string; subCategory: string; total: number }> {
  const bucket = new Map<string, { sector: string; subCategory: string; total: number }>();
  for (const lead of DEMO_LEADS) {
    const key = `${lead.sector}|${lead.subCategory}`;
    const entry = bucket.get(key) ?? { sector: lead.sector, subCategory: lead.subCategory, total: 0 };
    entry.total += 1;
    bucket.set(key, entry);
  }
  return [...bucket.values()].sort((a, b) => a.sector.localeCompare(b.sector, 'id'));
}
