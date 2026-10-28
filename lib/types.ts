import type { LeadStatus, Role } from './db/schema';

export type { LeadStatus, Role };

export type Category = {
  id: string;
  ownerId: string | null;
  ownerName?: string | null;
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Prospect = {
  placeId: string;
  name: string;
  address: string;
  /** Kota pencarian — dipakai untuk placeholder template WhatsApp. */
  city?: string;
  phoneRaw: string | null;
  phoneDisplay: string | null;
  whatsapp: string | null;
  website: string | null;
  rating: number | null;
  reviews: number;
  mapsUrl: string;
  sector: string;
  subCategory: string;
  pitch: string;
};

export type Lead = Prospect & {
  id: string;
  ownerId: string;
  ownerName?: string;
  status: LeadStatus;
  source: 'SEARCH' | 'MANUAL';
};

/**
 * Filter keberadaan website — opsional, bukan lagi kewajiban sistem.
 * `all` dipakai untuk partnership/suplai, `no_website` untuk jualan jasa web.
 */
export type WebsiteFilter = 'all' | 'no_website' | 'has_website';

export type SearchMeta = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
  city: string;
  query: string;
  limit: number;
  scanned: number;
  /** Tempat yang dibuang karena sudah punya website (filter no_website). */
  skippedWithWebsite: number;
  /** Tempat yang dibuang karena belum punya website (filter has_website). */
  skippedWithoutWebsite: number;
  websiteFilter: WebsiteFilter;
  totalQualified: number;
  pagesScanned: number;
  capped: boolean;
  /** Jumlah panggilan Place Details untuk melengkapi nomor telepon. */
  detailsCalls: number;
};

export type SearchResponse = {
  leads: Lead[];
  meta: SearchMeta;
  usage: UsageSnapshot;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  leads?: number;
};

export type UsageSnapshot = {
  period: string;
  userHits: number;
  userLimit: number;
  globalHits: number;
  globalLimit: number;
};

export type UsageLogEntry = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  endpoint: 'TEXT_SEARCH' | 'PLACE_DETAILS';
  queryParam: string;
  status: 'SUCCESS' | 'ERROR';
  httpStatus: number | null;
  placeId: string | null;
  durationMs: number;
  createdAt: string;
};

export type UsagePerUser = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  hits: number;
};

export type UsageOverview = {
  period: string;
  globalHits: number;
  globalLimit: number;
  perUser: UsagePerUser[];
  daily: Array<{ date: string; hits: number }>;
  logs: UsageLogEntry[];
  totalUsers: number;
};
