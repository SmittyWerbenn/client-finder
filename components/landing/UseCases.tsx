import Link from 'next/link';
import { DEMO_HREF } from '@/lib/site';

type UseCase = {
  step: string;
  title: string;
  target: string;
  filter: string;
  body: string;
  points: string[];
  accent: string;
};

const USE_CASES: UseCase[] = [
  {
    step: '01',
    title: 'Penjualan Jasa Web & IT',
    target: 'Web studio, freelancer, agensi digital',
    filter: 'Filter: Hanya Tanpa Website',
    body: 'Temukan bisnis tradisional yang belum punya kehadiran online dan butuh digitalisasi.',
    points: [
      'Saring khusus usaha tanpa website',
      'Pitch angle otomatis seputar katalog & profil online',
      'Template WhatsApp jasa pembuatan website',
    ],
    accent: '#4b8dff',
  },
  {
    step: '02',
    title: 'Supplier & Distribusi B2B',
    target: 'Distributor, produsen, vendor bahan baku',
    filter: 'Filter: Semua Bisnis',
    body: 'Cari seluruh bisnis pada kategori tertentu — misalnya semua restoran dan kafe di kota X — untuk penawaran suplai bahan baku atau peralatan.',
    points: [
      'Termasuk bisnis yang sudah punya website',
      'Segmentasi per kategori dan kota',
      'Template penawaran supplier & harga grosir',
    ],
    accent: '#10b981',
  },
  {
    step: '03',
    title: 'Agensi Layanan & Konsultan',
    target: 'Legalitas, akuntansi, periklanan, konsultan',
    filter: 'Filter: Semua / Sudah Punya Website',
    body: 'Tawarkan jasa pendukung ke entitas bisnis yang sudah berjalan dan siap berinvestasi pada layanan profesional.',
    points: [
      'Fokus pada bisnis aktif dan terverifikasi',
      'Pitch angle kemitraan & layanan pendukung',
      'Template jasa layanan profesional',
    ],
    accent: '#a855f7',
  },
];

export default function UseCases() {
  return (
    <section className="lnd-section lnd-section-alt" id="skenario">
      <div className="lnd-container">
        <header className="lnd-section-head">
          <span className="lnd-kicker">Skenario Penggunaan</span>
          <h2>Satu mesin, tiga cara menghasilkan</h2>
          <p>
            Filter status website bersifat opsional. Pilih skenario yang paling dekat dengan model bisnis Anda, lalu
            sesuaikan filter dan template pesannya.
          </p>
        </header>

        <div className="lnd-uc-grid">
          {USE_CASES.map((useCase) => (
            <article
              key={useCase.title}
              className="lnd-uc"
              style={{ ['--uc-accent' as string]: useCase.accent }}
            >
              <span className="lnd-uc-step">{useCase.step}</span>
              <h3>{useCase.title}</h3>
              <p className="lnd-uc-target">Untuk: {useCase.target}</p>
              <span className="lnd-uc-filter">{useCase.filter}</span>
              <p className="lnd-uc-body">{useCase.body}</p>
              <ul>
                {useCase.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="lnd-uc-note">
          Ingin melihat ketiga skenario berjalan dengan data contoh?{' '}
          <Link href={DEMO_HREF}>Coba demo interaktif &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
