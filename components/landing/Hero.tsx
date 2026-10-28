import Link from 'next/link';
import { DEMO_HREF, WA_MESSAGES, waLink } from '@/lib/site';

const STATS = [
  { value: '38', label: 'Provinsi' },
  { value: '514', label: 'Kota & Kabupaten' },
  { value: '4+', label: 'Niche siap jual' },
  { value: '1', label: 'Klik ke WhatsApp' },
];

const PREVIEW_ROWS = [
  { name: 'Padel Arena Buah Batu', meta: '4.6 ★ · 128 ulasan', status: 'Interested', tone: 'warm' },
  { name: 'Kopi Rindu Senja', meta: '4.5 ★ · 312 ulasan', status: 'New', tone: 'new' },
  { name: 'Konveksi Sablon Kaos Kita', meta: '4.4 ★ · 64 ulasan', status: 'Contacted', tone: 'cold' },
];

export default function Hero() {
  return (
    <section className="lnd-hero">
      <div className="lnd-glow lnd-glow-a" aria-hidden="true" />
      <div className="lnd-glow lnd-glow-b" aria-hidden="true" />

      <div className="lnd-container lnd-hero-grid">
        <div className="lnd-hero-copy">
          <span className="lnd-eyebrow">
            <span className="lnd-dot" aria-hidden="true" />
            Prospect engine untuk agency, freelancer &amp; web studio
          </span>

          <h1>
            Temukan Ribuan Calon Klien Bisnis Lokal Siap Beli{' '}
            <span className="lnd-grad">Tanpa Repot Riset Manual.</span>
          </h1>

          <p className="lnd-hero-sub">
            Mesin pencari prospek otomatis berbasis Google Maps. Saring bisnis lokal di seluruh Indonesia yang belum
            memiliki website, dapatkan kontak WhatsApp langsung pemiliknya, dan jalankan outreach sekali klik.
          </p>

          <div className="lnd-cta-row">
            <Link href={DEMO_HREF} className="lnd-btn lnd-btn-primary lnd-btn-lg">
              &#128640; Coba Demo Langsung (Tanpa Login)
            </Link>
            <a
              href={waLink(WA_MESSAGES.consult)}
              target="_blank"
              rel="noreferrer"
              className="lnd-btn lnd-btn-outline lnd-btn-lg"
            >
              &#128172; Konsultasi &amp; Beli Akses
            </a>
          </div>

          <ul className="lnd-stats">
            {STATS.map((stat) => (
              <li key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lnd-hero-visual" aria-hidden="true">
          <div className="lnd-preview">
            <div className="lnd-preview-bar">
              <span />
              <span />
              <span />
              <em>client-finder.frel.cloud/console</em>
            </div>
            <div className="lnd-preview-body">
              <div className="lnd-preview-search">
                <div>
                  <small>Kategori usaha</small>
                  <div className="lnd-fake-input">Lapangan Padel, Futsal &amp; Badminton</div>
                </div>
                <div>
                  <small>Kota</small>
                  <div className="lnd-fake-input">Kota Bandung</div>
                </div>
                <span className="lnd-fake-btn">Cari Prospek</span>
              </div>

              <div className="lnd-preview-rows">
                {PREVIEW_ROWS.map((row) => (
                  <div key={row.name} className="lnd-preview-row">
                    <div className="lnd-preview-info">
                      <b>{row.name}</b>
                      <small>{row.meta} · tanpa website</small>
                    </div>
                    <span className={`lnd-pv-badge ${row.tone}`}>{row.status}</span>
                    <span className="lnd-pv-wa">WA</span>
                  </div>
                ))}
              </div>

              <div className="lnd-preview-foot">
                <span>
                  <b>18</b> prospek tanpa website
                </span>
                <span>
                  <b>34</b> usaha ber-website dibuang
                </span>
              </div>
            </div>
          </div>

          <div className="lnd-float-card">
            <span className="lnd-float-icon">WA</span>
            <div>
              <b>Broadcast siap kirim</b>
              <small>{'Template personalisasi {{business_name}} & {{city}}'}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
