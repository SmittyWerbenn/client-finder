type Feature = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: 'Akuisisi Prospek Multi-Sektor',
    body: 'Cocok untuk vendor, supplier, agensi, konsultan, hingga brand partnership. Semua jenis bisnis lokal bisa dipetakan, bukan hanya target jasa pembuatan website.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M9 20v-6h6v6M4 20h16" />
        <path d="M8 9h.01M12 9h.01M16 9h.01" />
      </svg>
    ),
  },
  {
    title: 'Jangkauan Nasional',
    body: 'Terintegrasi dengan 38 provinsi dan seluruh kota/kabupaten di Indonesia. Dari Banda Aceh sampai Merauke, satu dashboard.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Fleksibilitas Filter Tujuan',
    body: 'Cari semua bisnis untuk suplai/partnership, atau filter khusus bisnis tanpa website jika kebutuhan Anda menawarkan jasa pembuatan website & transformasi digital.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M7 12h10M10 18h4" />
        <circle cx="8" cy="6" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Outreach Sekali Klik',
    body: 'Integrasi WhatsApp 1-click & mass broadcast dengan template pesan personalisasi {{business_name}}, {{city}}, dan {{pitch_angle}} untuk tiap tujuan penawaran.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 11.6a8.2 8.2 0 0 1-11.9 7.3L4 20.5l1.7-4.4A8.2 8.2 0 1 1 20.5 11.6z" />
        <path d="M8.8 8.6c.2-.5.7-.5 1 0l.8 1.5c.1.3 0 .6-.2.8l-.6.5c.5 1 1.3 1.8 2.3 2.3l.5-.6c.2-.2.5-.3.8-.2l1.5.8c.5.3.5.8 0 1-1.4.8-3.3.3-4.8-1.2s-2-3.4-1.3-4.9z" />
      </svg>
    ),
  },
  {
    title: 'Pencarian Pengambil Keputusan',
    body: 'Tombol cepat pelacak profil Owner/Founder via LinkedIn X-Ray. Tahu siapa yang harus dihubungi sebelum menawarkan kerja sama atau suplai.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M9.7 8.6 14.3 15.4M16.2 6.2h4.3v4.3M7.8 17.8H3.5v-4.3" />
      </svg>
    ),
  },
];

const REASONS = [
  {
    metric: '±8 jam',
    title: 'Riset manual per minggu dihemat',
    body: 'Tidak perlu buka Google Maps satu per satu, salin nomor, lalu cek website satu-satu. Semua beres dalam satu sesi pencarian.',
  },
  {
    metric: '100%',
    title: 'Data dari Google Maps resmi',
    body: 'Nama, alamat, rating, ulasan, nomor telepon, hingga status website diambil dari Google Places API — bukan scraping abal-abal yang cepat basi.',
  },
  {
    metric: '4',
    title: 'Preset pesan siap pakai',
    body: 'Template jasa web, kemitraan, supplier/grosir, dan layanan profesional. Pilih sudut penawaran yang paling relevan dengan target Anda.',
  },
];

export default function Features() {
  return (
    <>
      <section className="lnd-section" id="fitur">
        <div className="lnd-container">
          <header className="lnd-section-head">
            <span className="lnd-kicker">Keunggulan Utama</span>
            <h2>Kenapa Bisnis, Tim Sales, &amp; Agency Memilih ClientFinder</h2>
            <p>
              ClientFinder bukan hanya alat pencari bisnis tanpa website. Ini mesin akuisisi prospek B2B yang bisa
              disesuaikan untuk penjualan, suplai, kemitraan, maupun jasa profesional.
            </p>
          </header>

          <div className="lnd-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="lnd-feature-card">
                <span className="lnd-icon-tile" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lnd-section lnd-section-alt" id="keunggulan">
        <div className="lnd-container">
          <header className="lnd-section-head">
            <span className="lnd-kicker">Keunggulan</span>
            <h2>Dirancang untuk tim yang butuh pipeline, bukan sekadar daftar nomor</h2>
            <p>Dari riset pasar sampai chat pertama, seluruh alur prospeksi berjalan dalam satu dashboard.</p>
          </header>

          <div className="lnd-reason-grid">
            {REASONS.map((reason) => (
              <article key={reason.title} className="lnd-reason">
                <strong>{reason.metric}</strong>
                <h3>{reason.title}</h3>
                <p>{reason.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
