export type Category = {
  id: string;
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
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

export type SearchMeta = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
  city: string;
  /** Query Text Search aktual: `"<keyword> di <kota>"`. */
  query: string;
  /** Plafon keras prospek tanpa website per pencarian (100). */
  limit: number;
  /** Jumlah tempat mentah yang dipindai dari Google. */
  scanned: number;
  skippedWithWebsite: number;
  totalQualified: number;
  pagesScanned: number;
  /** true bila loop berhenti karena plafon `limit` tercapai. */
  capped: boolean;
  mock: boolean;
};

export type SearchResponse = {
  ok: true;
  meta: SearchMeta;
  results: Prospect[];
};

export type ApiError = {
  ok: false;
  error: string;
  code?: string;
};
