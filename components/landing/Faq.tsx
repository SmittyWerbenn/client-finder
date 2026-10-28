const FAQS = [
  {
    q: 'Apakah saya perlu punya Google Cloud API key sendiri?',
    a: 'Tidak. Kuota Google Places API sudah termasuk dalam paket yang Anda beli dan dipantau oleh admin melalui audit log. Untuk paket Enterprise Anda bisa memakai dedicated API key milik sendiri bila ingin kontrol biaya penuh.',
  },
  {
    q: 'Bagaimana cara kerja filter "tanpa website"?',
    a: 'Setiap hasil pencarian dari Google Places diperiksa field website-nya. Bisnis yang sudah memiliki domain aktif otomatis dibuang sebelum masuk ke tabel prospek, sehingga daftar yang Anda terima benar-benar target jasa pembuatan website.',
  },
  {
    q: 'Apakah data leads bisa di-export?',
    a: 'Bisa. Semua paket mendukung export CSV sesuai filter yang sedang aktif, siap diimpor ke Google Sheets, CRM, atau tools email/WhatsApp marketing Anda.',
  },
  {
    q: 'Apakah demo menyimpan data saya?',
    a: 'Tidak. Mode demo berjalan read-only dengan data dummy lokal di browser: tidak ada koneksi ke Google Places API, tidak ada data yang ditulis ke database, dan tidak ada pesan WhatsApp yang benar-benar terkirim.',
  },
  {
    q: 'Berapa lama akses aktif setelah pembayaran?',
    a: 'Aktivasi manual oleh admin, umumnya di bawah 30 menit pada jam kerja. Anda akan menerima email, password sementara, dan panduan singkat penggunaan console.',
  },
  {
    q: 'Bisa request kategori atau kota tertentu?',
    a: 'Bisa. Kategori dan pitch angle bisa ditambah melalui menu Kategori & Pitch. Jika kota atau niche Anda belum ada di katalog bawaan, sampaikan saat konsultasi dan tim kami akan menambahkannya.',
  },
];

export default function Faq() {
  return (
    <section className="lnd-section lnd-section-alt" id="faq">
      <div className="lnd-container lnd-faq-wrap">
        <header className="lnd-section-head lnd-section-head-left">
          <span className="lnd-kicker">FAQ</span>
          <h2>Pertanyaan yang sering diajukan</h2>
          <p>Belum terjawab? Chat admin langsung, biasanya balas di jam kerja 09.00–21.00 WIB.</p>
        </header>

        <div className="lnd-faq">
          {FAQS.map((item) => (
            <details key={item.q} className="lnd-faq-item">
              <summary>
                <span>{item.q}</span>
                <span className="lnd-faq-icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
