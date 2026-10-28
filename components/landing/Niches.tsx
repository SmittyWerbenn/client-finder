import { DEMO_HREF } from '@/lib/site';
import Link from 'next/link';

type Niche = {
  tag: string;
  title: string;
  angle: string;
  bullets: string[];
  accent: string;
};

const NICHES: Niche[] = [
  {
    tag: 'Olahraga & Venue',
    title: 'Fasilitas Olahraga & Sewa Lapangan',
    angle: 'Sistem Booking Jam & Member',
    bullets: ['Kalender slot real-time', 'Pembayaran DP via QRIS', 'Langganan member mingguan'],
    accent: '#3b82f6',
  },
  {
    tag: 'F&B',
    title: 'Makanan & Minuman / F&B',
    angle: 'Reservasi Meja Deposit & Web Order Direct',
    bullets: ['Reservasi meja anti no-show', 'Pre-order acara & gathering', 'Order langsung tanpa komisi ojol'],
    accent: '#f59e0b',
  },
  {
    tag: 'Retail',
    title: 'Toko Fisik & Bahan Bangunan',
    angle: 'Katalog Online & Request for Quote',
    bullets: ['Katalog ribuan SKU', 'Form RFQ untuk proyek', 'Order borongan terstruktur'],
    accent: '#10b981',
  },
  {
    tag: 'Jasa',
    title: 'Jasa, Servis & Konveksi',
    angle: 'Kalkulator Estimasi Harga & Antrean Servis',
    bullets: ['Estimasi harga otomatis', 'Antrean & status pengerjaan', 'Upload desain / brief'],
    accent: '#a855f7',
  },
];

export default function Niches() {
  return (
    <section className="lnd-section" id="kategori">
      <div className="lnd-container">
        <header className="lnd-section-head">
          <span className="lnd-kicker">Kategori Bisnis</span>
          <h2>Niche siap jual, lengkap dengan angle penawarannya</h2>
          <p>
            Setiap kategori punya <em>pitch angle</em> bawaan yang sudah disesuaikan dengan masalah operasional bisnis
            tersebut. Tinggal pilih, cari, dan kirim.
          </p>
        </header>

        <div className="lnd-niche-grid">
          {NICHES.map((niche) => (
            <article key={niche.title} className="lnd-niche" style={{ ['--niche-accent' as string]: niche.accent }}>
              <span className="lnd-niche-tag">{niche.tag}</span>
              <h3>{niche.title}</h3>
              <p className="lnd-niche-angle">{niche.angle}</p>
              <ul>
                {niche.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="lnd-niche-note">
          Masih ada 14 sub-kategori lain di dalam console — dari klinik hewan, florist, catering, sampai rental
          kendaraan.{' '}
          <Link href={DEMO_HREF}>Lihat semuanya di demo interaktif &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
