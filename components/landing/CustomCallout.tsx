import { DEMO_HREF, WA_MESSAGES, waLink } from '@/lib/site';
import Link from 'next/link';

const ITEMS = [
  'Website company profile, katalog produk, dan landing page konversi',
  'Sistem operasional: ERP ringan, POS, manajemen stok, dan invoice',
  'Sistem booking lapangan, antrean servis, dan reservasi dengan deposit',
  'Integrasi WhatsApp Gateway, CRM, payment gateway, dan webhook internal',
];

export default function CustomCallout() {
  return (
    <section className="lnd-section" id="custom">
      <div className="lnd-container">
        <div className="lnd-custom">
          <div className="lnd-custom-copy">
            <span className="lnd-kicker">Custom System</span>
            <h2>Butuh sistem di luar template standar? Tim kami siap membangunnya.</h2>
            <p>
              ClientFinder tidak berhenti di pencarian prospek. Ketika klien Anda butuh website atau sistem operasional
              yang benar-benar sesuai alur bisnisnya, tim engineer kami bisa mengerjakan dari desain sampai deploy.
            </p>

            <ul className="lnd-custom-list">
              {ITEMS.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">◆</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="lnd-cta-row">
              <a
                href={waLink(WA_MESSAGES.customProject)}
                target="_blank"
                rel="noreferrer"
                className="lnd-btn lnd-btn-primary lnd-btn-lg"
              >
                Diskusi Proyek Kustom
              </a>
              <Link href={DEMO_HREF} className="lnd-btn lnd-btn-outline lnd-btn-lg">
                Lihat Console Demo
              </Link>
            </div>
          </div>

          <div className="lnd-custom-panel" aria-hidden="true">
            <div className="lnd-custom-row">
              <span className="lnd-custom-step">01</span>
              <div>
                <b>Discovery &amp; scope</b>
                <small>Pemetaan alur bisnis, kebutuhan integrasi, dan estimasi biaya.</small>
              </div>
            </div>
            <div className="lnd-custom-row">
              <span className="lnd-custom-step">02</span>
              <div>
                <b>Build &amp; review</b>
                <small>Pengembangan bertahap dengan preview link yang bisa Anda coba.</small>
              </div>
            </div>
            <div className="lnd-custom-row">
              <span className="lnd-custom-step">03</span>
              <div>
                <b>Deploy &amp; handover</b>
                <small>Domain, hosting, pelatihan admin, dan garansi pasca-rilis.</small>
              </div>
            </div>
            <div className="lnd-custom-foot">
              <span>Rata-rata pengerjaan</span>
              <b>2–6 minggu</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
