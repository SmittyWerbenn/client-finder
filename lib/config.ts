/**
 * Konfigurasi runtime yang dibaca dari environment variable. Semua nilai
 * divalidasi di satu tempat agar route handler tidak tersebar `Number(env)`.
 */

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const config = {
  places: {
    get apiKey(): string {
      return process.env.GOOGLE_PLACES_API_KEY?.trim() ?? '';
    },
    get baseUrl(): string {
      const raw = process.env.GOOGLE_PLACES_API_BASE_URL?.trim() || 'https://places.googleapis.com/v1';
      return raw.replace(/\/+$/, '');
    },
    maxProspects: 100,
    perPage: 20,
    maxRawPages: 6,
    nextPageDelayMs: positiveInt(process.env.PLACES_PAGE_DELAY_MS, 2500),
    retryDelayMs: positiveInt(process.env.PLACES_RETRY_DELAY_MS, 2500),
    pageTokenRetries: 2,
    detailsMaxPerSearch: positiveInt(process.env.PLACES_DETAILS_MAX, 20),
    requestTimeoutMs: positiveInt(process.env.PLACES_TIMEOUT_MS, 20000),
  },
  quota: {
    globalMonthlyLimit: positiveInt(process.env.API_HIT_MONTHLY_LIMIT, 5000),
    userMonthlyLimit: positiveInt(process.env.USER_MONTHLY_HIT_LIMIT, 500),
  },
} as const;

export function currentPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}
