import { config } from './config';
import { recordApiHit, type PlacesEndpoint } from './api-tracker';
import { HttpError } from './errors';
import { normalizePhone } from './phone';
import type { Prospect, SearchMeta } from './types';

/**
 * Integrasi Google Places API (New) — hanya dipanggil dari server.
 *
 * Pipeline:
 * 1. Text Search `<keyword> di <kota>` (20 hasil/halaman, nextPageToken
 *    dengan jeda minimal 2,5 dtk).
 * 2. Buang semua place yang punya `websiteUri` (filter wajib).
 * 3. Untuk place tanpa nomor telepon, Place Details (field mask minimal)
 *    dijalankan terbatas `PLACES_DETAILS_MAX` per pencarian.
 * 4. Nomor dinormalisasi ke format WhatsApp 62xxx, duplikat placeId dibuang.
 * 5. Berhenti saat 100 prospek terkumpul atau token halaman habis.
 *
 * Setiap panggilan HTTP (termasuk retry & request gagal) dicatat atomik oleh
 * `recordApiHit` dengan userId, endpoint, query, status, dan durasi.
 */

const TEXT_SEARCH_FIELDS = [
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

const DETAILS_FIELDS = [
  'id',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
].join(',');

export class PlacesError extends HttpError {
  constructor(message: string, status = 502, code = 'PLACES_API_ERROR') {
    super(status, code, message);
    this.name = 'PlacesError';
  }
}

type GooglePlace = {
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

type PlacesJson = { places?: GooglePlace[]; nextPageToken?: string };

export type SearchCategoryInput = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
};

export type SearchInput = {
  userId: string;
  category: SearchCategoryInput;
  city: string;
};

export type SearchOutput = {
  prospects: Prospect[];
  meta: SearchMeta;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Filter ketat: website dianggap ada bila string tidak kosong. */
export function hasWebsite(place: GooglePlace): boolean {
  return typeof place.websiteUri === 'string' && place.websiteUri.trim() !== '';
}

function placeIdOf(place: GooglePlace): string {
  return (
    place.id?.trim() ||
    `${place.displayName?.text ?? 'unknown'}-${place.formattedAddress ?? ''}`.slice(0, 160)
  );
}

export function toProspect(place: GooglePlace, category: SearchCategoryInput, city: string): Prospect {
  const phone = normalizePhone(place.internationalPhoneNumber || place.nationalPhoneNumber || null);
  return {
    placeId: placeIdOf(place),
    name: place.displayName?.text?.trim() || 'Tanpa nama',
    address: place.formattedAddress?.trim() || '-',
    city,
    phoneRaw: phone?.raw ?? place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
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

/* ───────────────────────── HTTP + tracking ───────────────────────── */

type PlacesRequest = {
  url: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  fieldMask: string;
  userId: string;
  endpoint: PlacesEndpoint;
  queryParam: string;
  placeId?: string;
};

async function callPlaces<T>(request: PlacesRequest): Promise<T> {
  const apiKey = config.places.apiKey;
  if (!apiKey) {
    throw new PlacesError(
      'GOOGLE_PLACES_API_KEY belum dikonfigurasi di server.',
      503,
      'PLACES_NOT_CONFIGURED',
    );
  }

  const startedAt = Date.now();
  let httpStatus: number | null = null;

  try {
    let response: Response;
    try {
      response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': request.fieldMask,
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(config.places.requestTimeoutMs),
      });
    } catch {
      throw new PlacesError('Gagal menghubungi Google Places API (jaringan/timeout). Coba lagi.', 504);
    }

    httpStatus = response.status;

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let googleMessage = '';
      try {
        googleMessage = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? '';
      } catch {
        googleMessage = text.slice(0, 200);
      }
      const suffix = googleMessage ? ` — ${googleMessage}` : '';

      if (response.status === 400) {
        throw new PlacesError(`Permintaan ditolak Google Places API (400).${suffix}`, 400);
      }
      if (response.status === 401 || response.status === 403) {
        throw new PlacesError(
          `GOOGLE_PLACES_API_KEY tidak valid atau Places API (New) belum aktif / billing belum aktif.${suffix}`,
          403,
        );
      }
      if (response.status === 429) {
        throw new PlacesError(`Kuota Google Places API habis atau request terlalu cepat (429).${suffix}`, 429);
      }
      throw new PlacesError(`Google Places API error ${response.status}.${suffix}`, 502);
    }

    const json = (await response.json()) as T;
    // Kegagalan pencatatan tidak boleh menggagalkan pencarian; log ke server.
    await recordApiHit({
      userId: request.userId,
      endpoint: request.endpoint,
      queryParam: request.queryParam,
      status: 'SUCCESS',
      httpStatus,
      placeId: request.placeId ?? null,
      durationMs: Date.now() - startedAt,
    }).catch((trackerError: unknown) => {
      console.error('[api-tracker] gagal mencatat hit sukses', trackerError);
    });
    return json;
  } catch (error) {
    if (error instanceof PlacesError && error.code === 'PLACES_NOT_CONFIGURED') throw error;
    const status = error instanceof PlacesError ? error.status : 502;
    await recordApiHit({
      userId: request.userId,
      endpoint: request.endpoint,
      queryParam: request.queryParam,
      status: 'ERROR',
      httpStatus: status === 504 ? null : httpStatus,
      placeId: request.placeId ?? null,
      durationMs: Date.now() - startedAt,
    }).catch((trackerError: unknown) => {
      console.error('[api-tracker] gagal mencatat hit', trackerError);
    });
    throw error;
  }
}

async function fetchTextPage(
  input: SearchInput,
  query: string,
  pageToken: string | null,
): Promise<PlacesJson> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: 'id',
    regionCode: 'ID',
    pageSize: config.places.perPage,
  };
  if (pageToken) body.pageToken = pageToken;

  let attempt = 0;
  for (;;) {
    try {
      return await callPlaces<PlacesJson>({
        url: `${config.places.baseUrl}/places:searchText`,
        method: 'POST',
        body,
        fieldMask: TEXT_SEARCH_FIELDS,
        userId: input.userId,
        endpoint: 'TEXT_SEARCH',
        queryParam: query,
      });
    } catch (error) {
      const tokenNotReady =
        Boolean(pageToken) &&
        error instanceof PlacesError &&
        error.status === 400 &&
        /INVALID_REQUEST|invalid page token/i.test(error.message);
      if (!tokenNotReady || attempt >= config.places.pageTokenRetries) throw error;
      attempt += 1;
      await delay(config.places.retryDelayMs);
    }
  }
}

async function fetchPlaceDetails(place: GooglePlace, input: SearchInput): Promise<GooglePlace> {
  const id = placeIdOf(place);
  return callPlaces<GooglePlace>({
    url: `${config.places.baseUrl}/places/${encodeURIComponent(id)}?languageCode=id`,
    method: 'GET',
    fieldMask: DETAILS_FIELDS,
    userId: input.userId,
    endpoint: 'PLACE_DETAILS',
    queryParam: place.displayName?.text ?? id,
    placeId: id,
  });
}

/* ───────────────────────── pipeline pencarian ───────────────────────── */

export async function searchProspects(input: SearchInput): Promise<SearchOutput> {
  if (!config.places.apiKey) {
    throw new PlacesError(
      'Layanan pencarian belum dikonfigurasi: GOOGLE_PLACES_API_KEY kosong.',
      503,
      'PLACES_NOT_CONFIGURED',
    );
  }

  const city = input.city.trim();
  const query = `${input.category.keyword} di ${city}`;

  const collected = new Map<string, Prospect>();
  let pageToken: string | null = null;
  let scanned = 0;
  let skippedWithWebsite = 0;
  let pagesScanned = 0;
  let capped = false;

  while (pagesScanned < config.places.maxRawPages) {
    if (pagesScanned > 0) await delay(config.places.nextPageDelayMs);

    const page = await fetchTextPage(input, query, pageToken);
    const places = page.places ?? [];
    pagesScanned += 1;
    scanned += places.length;

    for (const place of places) {
      if (hasWebsite(place)) {
        skippedWithWebsite += 1;
        continue;
      }
      const prospect = toProspect(place, input.category, city);
      if (collected.has(prospect.placeId)) continue;
      collected.set(prospect.placeId, prospect);
    }

    if (collected.size >= config.places.maxProspects) {
      capped = true;
      break;
    }

    pageToken = page.nextPageToken ?? null;
    if (!pageToken || places.length === 0) break;
  }

  // Lengkapi nomor telepon lewat Place Details (biaya per request dibatasi).
  let detailsCalls = 0;
  for (const prospect of [...collected.values()]) {
    if (prospect.whatsapp) continue;
    if (detailsCalls >= config.places.detailsMaxPerSearch) break;

    detailsCalls += 1;
    try {
      const details = await fetchPlaceDetails({ id: prospect.placeId }, input);
      if (hasWebsite(details)) {
        collected.delete(prospect.placeId);
        skippedWithWebsite += 1;
        continue;
      }
      const enriched = toProspect(
        {
          id: prospect.placeId,
          displayName: { text: prospect.name },
          formattedAddress: prospect.address,
          nationalPhoneNumber: details.nationalPhoneNumber,
          internationalPhoneNumber: details.internationalPhoneNumber,
          websiteUri: details.websiteUri,
          rating: prospect.rating ?? undefined,
          userRatingCount: prospect.reviews,
          googleMapsUri: prospect.mapsUrl,
        },
        input.category,
        city,
      );
      collected.set(prospect.placeId, { ...prospect, ...enriched, city });
    } catch (error) {
      // Satu detail gagal tidak boleh menggagalkan seluruh pencarian.
      if (error instanceof PlacesError && (error.status === 401 || error.status === 403 || error.status === 429)) {
        throw error;
      }
      console.warn('[places] place details gagal', prospect.placeId, error);
    }
  }

  const prospects = [...collected.values()].slice(0, config.places.maxProspects);

  const meta: SearchMeta = {
    sector: input.category.sector,
    subCategory: input.category.subCategory,
    keyword: input.category.keyword,
    pitch: input.category.pitch,
    city,
    query,
    limit: config.places.maxProspects,
    scanned,
    skippedWithWebsite,
    totalQualified: prospects.length,
    pagesScanned,
    capped: capped || prospects.length >= config.places.maxProspects,
    detailsCalls,
  };

  return { prospects, meta };
}
