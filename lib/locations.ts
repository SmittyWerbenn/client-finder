/**
 * Adapter wilayah pencarian di atas dataset `lib/regions.ts` (38 provinsi,
 * 514 kota/kabupaten).
 *
 * Nilai `city` dikirim apa adanya ke Google Places sebagai bagian textQuery
 * tunggal (`"<keyword> di <city>"`), lalu dipakai sebagai cache key (lowercase).
 * Tidak ada geocoding / radius / koordinat: cakupan hasil sepenuhnya ditentukan
 * relevansi Google terhadap nama kota. Karena itu nama kota memakai format
 * "Kota Bandung" / "Kab. Bandung" / "Jakarta Selatan" yang dikenali Google.
 */

import { INDONESIA_REGIONS, type Region } from './regions';

export type ProvinceGroup = Region;

/** Semua provinsi, sudah urut alfabetis (sesuai dataset). */
export const PROVINCES: ProvinceGroup[] = INDONESIA_REGIONS;

/** Alias lama — dipertahankan agar import yang sudah ada tetap jalan. */
export const JAVA_PROVINCES = PROVINCES;

export const DEFAULT_PROVINCE = 'DKI Jakarta';
export const DEFAULT_CITY = 'Jakarta Selatan';

export function citiesForProvince(province: string): string[] {
  return INDONESIA_REGIONS.find((p) => p.province === province)?.cities ?? [];
}

/** Kota default untuk sebuah provinsi (opsi pertama), fallback ke DEFAULT_CITY. */
export function defaultCityFor(province: string): string {
  return citiesForProvince(province)[0] ?? DEFAULT_CITY;
}

/** Provinsi dari sebuah nama kota/kabupaten, null kalau tidak dikenal. */
export function provinceOfCity(city: string): string | null {
  for (const group of INDONESIA_REGIONS) {
    if (group.cities.includes(city)) return group.province;
  }
  return null;
}
