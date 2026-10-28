import Link from 'next/link';
import { DEMO_HREF } from '@/lib/site';

type UseCase = {
  step: string;
  title: string;
  body: string;
  usage: string;
  accent: string;
};

const USE_CASES: UseCase[] = [
  {
    step: '01',
    title: 'Penjualan Jasa Web, IT & Digitalisasi',
    body: 'Temukan tempat usaha yang belum memiliki website atau sistem online untuk ditawarkan pembuatan website, aplikasi kasir, sistem reservasi, maupun transformasi digital.',
    usage: 'Filter: Hanya Tanpa Website',
    accent: '#4b8dff',
  },
  {
    step: '02',
    title: 'Supplier, Distributor & Logistik B2B',
    body: 'Pasok bahan baku, packaging, peremajaan alat, atau kebutuhan logistik ke ratusan cabang restoran, kafe, bengkel, laundry, atau klinik di kota tujuan.',
    usage: 'Filter: Semua Bisnis · per kategori industri',
    accent: '#10b981',
  },
  {
    step: '03',
    title: 'Agensi Layanan, Konsultan & Jasa Profesional',
    body: 'Tawarkan layanan akuntansi, konsultan pajak, pengurusan legalitas/izin usaha, agensi periklanan, renovasi tempat, hingga kebersihan kantor ke bisnis yang sedang aktif beroperasi.',
    usage: 'Target: rating / ulasan tinggi',
    accent: '#f59e0b',
  },
  {
    step: '04',
    title: 'Brand Partnership, Sinergi & Sponsorship',
    body: 'Buka peluang cross-promotion, kolaborasi produk co-branding, kerja sama penempatan produk (titip jual), atau sponsorship event dengan pelaku usaha lokal yang sejalan.',
    usage: 'Tool: LinkedIn X-Ray owner',
    accent: '#a855f7',
  },
  {
    step: '05',
    title: 'Kebutuhan Kustom & Ekspansi Pasar Lainnya',
    body: 'Kumpulkan database calon rekanan untuk riset pasar kompetitor lokal, pembukaan cabang baru, hingga perekrutan mitra waralaba (franchise).',
    usage: 'Bebas: semua filter & kategori',
    accent: '#38bdf8',
  },
];

export default function UseCases() {
  return (
    <section className="lnd-section lnd-section-alt" id="skenario">
      <div className="lnd-container">
        <header className="lnd-section-head">
          <span className="lnd-kicker">Use-Case Matrix</span>
          <h2>Satu platform untuk semua kebutuhan bisnis</h2>
          <p>
            Filter status website bersifat opsional. Pilih skenario yang paling dekat dengan model bisnis Anda, lalu
            sesuaikan filter, kategori, dan template pesannya.
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
              <p className="lnd-uc-body">{useCase.body}</p>
              <span className="lnd-uc-filter">Cara pakai di console: {useCase.usage}</span>
            </article>
          ))}
        </div>

        <p className="lnd-uc-note">
          Ingin melihat kelima skenario berjalan dengan data contoh?{' '}
          <Link href={DEMO_HREF} prefetch={false}>Coba demo interaktif &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
