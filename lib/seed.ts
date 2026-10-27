import type { Category } from './types';

type SeedCategory = Pick<Category, 'id' | 'sector' | 'subCategory' | 'keyword' | 'pitch'>;

/**
 * Seeder awal: 4 sektor, 13 sub-kategori.
 * `keyword` dipakai sebagai query Google Maps ("<keyword> di <kota>").
 */
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  // 1. Fasilitas Olahraga & Sewa Tempat
  {
    id: 'padel-futsal-badminton',
    sector: 'Fasilitas Olahraga & Sewa Tempat',
    subCategory: 'Lapangan Padel, Futsal, & Badminton',
    keyword: 'lapangan padel futsal badminton',
    pitch:
      'Sistem reservasi slot jam real-time, kalender jadwal interaktif, pembayaran DP/lunas otomatis (QRIS), dan sistem langganan member rutin (mingguan/bulanan).',
  },
  {
    id: 'studio-senam-yoga-gym',
    sector: 'Fasilitas Olahraga & Sewa Tempat',
    subCategory: 'Studio Senam, Yoga, & Gym Lokal',
    keyword: 'studio yoga senam gym',
    pitch:
      'Sistem booking sesi kelas, kuota peserta per sesi, serta langganan kartu member.',
  },
  {
    id: 'ruang-acara-creative-space',
    sector: 'Fasilitas Olahraga & Sewa Tempat',
    subCategory: 'Ruang Acara & Creative Space',
    keyword: 'sewa ruang acara creative space',
    pitch:
      'Kalender ketersediaan sewa harian/setengah hari, kalkulator paket fasilitas tambahan (sound system, proyektor), dan form kontrak sewa.',
  },

  // 2. Makanan & Minuman (F&B)
  {
    id: 'restoran-keluarga-kafe-event',
    sector: 'Makanan & Minuman (F&B)',
    subCategory: 'Restoran Keluarga & Kafe Event',
    keyword: 'restoran keluarga kafe',
    pitch:
      'Sistem reservasi meja/VIP room dengan fitur deposit untuk cegah no-show, serta paket pre-order untuk acara gathering, arisan, atau ulang tahun.',
  },
  {
    id: 'catering-pernikahan-nasi-box',
    sector: 'Makanan & Minuman (F&B)',
    subCategory: 'Catering Pernikahan & Nasi Box',
    keyword: 'catering pernikahan nasi box',
    pitch:
      'Web katalog paket makanan, kalkulator harga per porsi (pax), serta formulir kustomisasi pilihan menu dan jadwal kirim.',
  },
  {
    id: 'resto-produk-kemasan',
    sector: 'Makanan & Minuman (F&B)',
    subCategory: 'Resto dengan Produk Kemasan',
    keyword: 'toko sambal frozen food oleh-oleh',
    pitch:
      'Web penjualan sambal botol, bumbu siap saji, atau makanan beku (frozen food) langsung ke konsumen tanpa potongan komisi aplikasi ojek online.',
  },

  // 3. Toko Fisik & Penjualan Barang Jadi
  {
    id: 'toko-mebel-furniture',
    sector: 'Toko Fisik & Penjualan Barang Jadi',
    subCategory: 'Toko Mebel & Furniture Custom',
    keyword: 'toko mebel furniture custom',
    pitch:
      'Katalog visual portofolio, simulasi estimasi harga berdasarkan ukuran/bahan, dan formulir pengajuan desain custom.',
  },
  {
    id: 'toko-bahan-bangunan-besi',
    sector: 'Toko Fisik & Penjualan Barang Jadi',
    subCategory: 'Toko Bahan Bangunan & Toko Besi',
    keyword: 'toko bahan bangunan besi',
    pitch:
      'Katalog ribuan stok barang, opsi minta penawaran (Request for Quote / RFQ), dan form order borongan/proyek.',
  },
  {
    id: 'florist-toko-buket',
    sector: 'Toko Fisik & Penjualan Barang Jadi',
    subCategory: 'Florist & Toko Buket',
    keyword: 'florist toko buket bunga',
    pitch:
      'Katalog visual bunga, pemilih kartu ucapan, opsi tanggal serta jam pengiriman spesifik.',
  },
  {
    id: 'distributor-frozen-sembako',
    sector: 'Toko Fisik & Penjualan Barang Jadi',
    subCategory: 'Distributor & Agen Frozen Food / Sembako',
    keyword: 'distributor agen frozen food sembako',
    pitch:
      'Sistem pemesanan grosir untuk reseller, batas minimal pembelian (minimum order), dan histori tagihan rutin.',
  },

  // 4. Jasa & Produksi Custom
  {
    id: 'konveksi-sablon-merchandise',
    sector: 'Jasa & Produksi Custom',
    subCategory: 'Konveksi, Sablon, & Merchandise',
    keyword: 'konveksi sablon merchandise',
    pitch:
      'Kalkulator harga dinamis berdasarkan jumlah lusin/bahan, upload file desain sablon, dan status pengerjaan pesanan.',
  },
  {
    id: 'bengkel-detailing-carwash',
    sector: 'Jasa & Produksi Custom',
    subCategory: 'Bengkel Mobil & Detailing / Car Wash',
    keyword: 'bengkel mobil detailing car wash',
    pitch:
      'Sistem booking antrean servis berkala, katalog paket coating/poles, serta pencatatan riwayat pengerjaan mobil pelanggan.',
  },
  {
    id: 'klinik-hewan-pet-care',
    sector: 'Jasa & Produksi Custom',
    subCategory: 'Klinik Hewan & Pet Care',
    keyword: 'klinik hewan pet shop grooming',
    pitch:
      'Web reservasi jadwal grooming, konsultasi dokter hewan, serta penitipan hewan peliharaan (pet hotel).',
  },
  {
    id: 'rental-kendaraan-ekspedisi',
    sector: 'Jasa & Produksi Custom',
    subCategory: 'Rental Kendaraan & Ekspedisi Lokal',
    keyword: 'rental mobil motor ekspedisi',
    pitch:
      'Pengecekan ketersediaan unit mobil/motor harian, kalkulator tarif jarak kirim, dan pelacakan status armada/resi.',
  },
];
