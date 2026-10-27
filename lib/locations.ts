/**
 * Daftar wilayah pencarian — fokus Pulau Jawa.
 *
 * Nilai `city` dikirim apa adanya ke Google Places sebagai bagian textQuery
 * tunggal (`"<keyword> di <city>"`), lalu dipakai sebagai cache key (lowercase).
 * Tidak ada geocoding / radius / koordinat: cakupan hasil sepenuhnya ditentukan
 * relevansi Google terhadap nama kota. Karena itu:
 *  - pakai nama tempat yang dikenali Google ("Jakarta Selatan", bukan "Jaksel");
 *  - tambah wilayah baru di sini saja — UI membangun dropdown dari array ini.
 */

export type ProvinceGroup = {
  province: string;
  cities: string[];
};

export const JAVA_PROVINCES: ProvinceGroup[] = [
  {
    province: 'DKI Jakarta',
    cities: [
      'Jakarta Selatan',
      'Jakarta Pusat',
      'Jakarta Barat',
      'Jakarta Timur',
      'Jakarta Utara',
      'Kepulauan Seribu',
    ],
  },
  {
    province: 'Banten',
    cities: ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon', 'Pandeglang', 'Lebak'],
  },
  {
    province: 'Jawa Barat',
    cities: [
      'Bandung',
      'Bandung Barat',
      'Bekasi',
      'Bogor',
      'Depok',
      'Cimahi',
      'Sukabumi',
      'Tasikmalaya',
      'Cirebon',
      'Banjar',
      'Garut',
      'Karawang',
      'Purwakarta',
      'Subang',
      'Sumedang',
      'Indramayu',
      'Majalengka',
      'Kuningan',
      'Cianjur',
      'Ciamis',
      'Pangandaran',
    ],
  },
  {
    province: 'Jawa Tengah',
    cities: [
      'Semarang',
      'Surakarta',
      'Magelang',
      'Salatiga',
      'Pekalongan',
      'Tegal',
      'Purwokerto',
      'Kudus',
      'Jepara',
      'Klaten',
      'Boyolali',
      'Sukoharjo',
      'Sragen',
      'Karanganyar',
      'Wonogiri',
      'Wonosobo',
      'Temanggung',
      'Cilacap',
      'Pati',
      'Rembang',
      'Blora',
      'Kebumen',
      'Purbalingga',
      'Banjarnegara',
      'Brebes',
      'Pemalang',
      'Batang',
      'Kendal',
      'Demak',
      'Grobogan',
    ],
  },
  {
    province: 'DI Yogyakarta',
    cities: ['Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo', 'Gunungkidul'],
  },
  {
    province: 'Jawa Timur',
    cities: [
      'Surabaya',
      'Malang',
      'Batu',
      'Kediri',
      'Blitar',
      'Madiun',
      'Mojokerto',
      'Pasuruan',
      'Probolinggo',
      'Sidoarjo',
      'Gresik',
      'Jember',
      'Banyuwangi',
      'Lumajang',
      'Jombang',
      'Nganjuk',
      'Tulungagung',
      'Trenggalek',
      'Pacitan',
      'Ponorogo',
      'Magetan',
      'Ngawi',
      'Bojonegoro',
      'Tuban',
      'Lamongan',
      'Situbondo',
      'Bondowoso',
      'Bangkalan',
      'Sampang',
      'Pamekasan',
      'Sumenep',
    ],
  },
];

export const DEFAULT_PROVINCE = 'DKI Jakarta';
export const DEFAULT_CITY = 'Jakarta Selatan';

export function citiesForProvince(province: string): string[] {
  return JAVA_PROVINCES.find((p) => p.province === province)?.cities ?? [];
}

/** Kota default untuk sebuah provinsi (opsi pertama), fallback ke DEFAULT_CITY. */
export function defaultCityFor(province: string): string {
  return citiesForProvince(province)[0] ?? DEFAULT_CITY;
}

/** Provinsi dari sebuah nama kota, null bila di luar daftar Jawa. */
export function provinceOfCity(city: string): string | null {
  for (const group of JAVA_PROVINCES) {
    if (group.cities.includes(city)) return group.province;
  }
  return null;
}
