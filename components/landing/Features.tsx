type Feature = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: 'Filter Khusus Tanpa Website',
    body: 'Sistem otomatis membuang bisnis yang sudah punya website. Penawaran jasa pembuatan web dan sistem jadi tepat sasaran, bukan tembakan acak.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" />
      </svg>
    ),
  },
  {
    title: 'Cakupan Nasional',
    body: 'Terintegrasi dengan 38 provinsi dan seluruh kota/kabupaten di Indonesia. Dari Banda Aceh sampai Merauke, satu dashboard.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z" />
      </svg>
    ),
  },
  {
    title: '1-Click WhatsApp & Mass Broadcast',
    body: 'Outreach instan dengan template pesan personalisasi {{business_name}}, {{city}}, dan {{pitch_angle}}. Kirim ke seluruh baris tabel tanpa copy-paste.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 11.6a8.2 8.2 0 0 1-11.9 7.3L4 20.5l1.7-4.4A8.2 8.2 0 1 1 20.5 11.6z" />
        <path d="M8.8 8.6c.2-.5.7-.5 1 0l.8 1.5c.1.3 0 .6-.2.8l-.6.5c.5 1 1.3 1.8 2.3 2.3l.5-.6c.2-.2.5-.3.8-.2l1.5.8c.5.3.5.8 0 1-1.4.8-3.3.3-4.8-1.2s-2-3.4-1.3-4.9z" />
      </svg>
    ),
  },
  {
    title: 'LinkedIn Decision Maker Locator',
    body: 'Lacak profil Owner, Founder, atau Manager lewat Google X-Ray search indexing. Tahu siapa yang harus dihubungi sebelum menawarkan.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M9.7 8.6 14.3 15.4M16.2 6.2h4.3v4.3M7.8 17.8H3.5v-4.3" />
      </svg>
    ),
  },
  {
    title: 'Kontrol Penggunaan API',
    body: 'Monitoring kuota Google Cloud transparan di dashboard admin: hit per user, audit log per endpoint, dan peringatan kuota.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18a8 8 0 1 1 16 0" />
        <path d="M12 18l4.2-5.4" />
        <circle cx="12" cy="18" r="1.2" />
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
    body: 'Nama, alamat, rating, ulasan, dan nomor telepon diambil dari Google Places API — bukan scraping abal-abal yang cepat basi.',
  },
  {
    metric: '3x',
    title: 'Peluang closing lebih tinggi',
    body: 'Karena Anda hanya menghubungi usaha tanpa website dengan pitch yang sudah disesuaikan jenis bisnisnya.',
  },
];

export default function Features() {
  return (
    <>
      <section className="lnd-section" id="fitur">
        <div className="lnd-container">
          <header className="lnd-section-head">
            <span className="lnd-kicker">Fitur Utama</span>
            <h2>Satu dashboard untuk seluruh pipeline prospecting Anda</h2>
            <p>
              Berhenti menghabiskan kuota waktu untuk riset manual. ClientFinder menyatukan pencarian, penyaringan,
              penyimpanan lead, dan outreach WhatsApp dalam satu alur.
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
            <h2>Kenapa agency dan freelancer memilih ClientFinder</h2>
            <p>Bukan sekadar daftar nomor. Ini mesin akuisisi klien untuk jasa pembuatan website dan sistem.</p>
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
