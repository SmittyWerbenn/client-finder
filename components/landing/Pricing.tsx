import { WA_MESSAGES, waLink } from '@/lib/site';

type Plan = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  quota: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'STARTER PASS',
    tagline: 'Cocok untuk freelancer yang baru mulai jualan jasa website.',
    price: 'Rp 199.000',
    priceNote: 'Top-up / sekali beli',
    quota: '5x Sesi Pencarian (hingga 250 kontak leads)',
    features: [
      'Akses basis data 38 provinsi se-Indonesia',
      'Filter otomatis bisnis tanpa website',
      'Export data ke CSV',
      '1-Click Direct WhatsApp',
    ],
    cta: 'Beli Paket Starter',
    href: waLink(WA_MESSAGES.starter),
  },
  {
    name: 'AGENCY PRO',
    tagline: 'Paling pas untuk agency dan web studio yang prospecting tiap hari.',
    price: 'Rp 499.000',
    priceNote: 'Top-up / sekali beli',
    quota: '15x Sesi Pencarian (hingga 1.000 kontak leads)',
    features: [
      'Semua fitur di Paket Starter',
      'Mass WhatsApp Broadcast ke seluruh baris tabel',
      'Tool pelacak pemilik bisnis via LinkedIn Decision Maker',
      'Custom template broadcast tanpa batas',
      'Prioritas bantuan support',
    ],
    cta: 'Pilih Paket Pro',
    href: waLink(WA_MESSAGES.pro),
    featured: true,
  },
  {
    name: 'ENTERPRISE & CUSTOM SYSTEM',
    tagline: 'Untuk tim sales, konsultan, atau kebutuhan white-label.',
    price: 'Kustom',
    priceNote: 'Sesuai kebutuhan',
    quota: 'Kuota fleksibel / unlimited via dedicated API key',
    features: [
      'Kategori usaha & kota tanpa batas',
      'Pembuatan website atau sistem kustom (ERP, POS, Custom Web) untuk klien Anda',
      'Integrasi CRM, WhatsApp Gateway, atau Webhook khusus',
      'Konsultasi teknis langsung dengan tim engineer',
    ],
    cta: 'Konsultasi Kebutuhan Kustom',
    href: waLink(WA_MESSAGES.custom),
  },
];

export default function Pricing() {
  return (
    <section className="lnd-section lnd-section-alt" id="harga">
      <div className="lnd-container">
        <header className="lnd-section-head">
          <span className="lnd-kicker">Harga Lisensi</span>
          <h2>Pilih paket sesuai volume prospecting Anda</h2>
          <p>
            Sekali beli, tanpa biaya bulanan tersembunyi. Kuota pencarian bisa di-top-up kapan saja saat stok lead
            mulai menipis.
          </p>
        </header>

        <div className="lnd-pricing-grid">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`lnd-plan ${plan.featured ? 'is-featured' : ''}`}>
              {plan.featured ? <span className="lnd-plan-badge">Paling Populer</span> : null}

              <header>
                <h3>{plan.name}</h3>
                <p className="lnd-plan-tagline">{plan.tagline}</p>
              </header>

              <div className="lnd-plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.priceNote}</span>
              </div>

              <div className="lnd-plan-quota">{plan.quota}</div>

              <ul className="lnd-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                target="_blank"
                rel="noreferrer"
                className={`lnd-btn lnd-btn-block ${plan.featured ? 'lnd-btn-primary' : 'lnd-btn-outline'}`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>

        <p className="lnd-pricing-note">
          Semua pembelian diproses manual oleh admin via WhatsApp untuk memastikan akun dan kuota aktif sebelum
          digunakan. Butuh invoice perusahaan? Sebutkan saat konsultasi.
        </p>
      </div>
    </section>
  );
}
