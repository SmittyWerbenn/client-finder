import Link from 'next/link';
import { DEMO_HREF, WA_MESSAGES, waLink } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="lnd-footer">
      <div className="lnd-container lnd-footer-grid">
        <div className="lnd-footer-brand">
          <Link href="/" className="lnd-brand">
            <span className="lnd-brand-mark">CF</span>
            <span className="lnd-brand-text">
              <strong>ClientFinder</strong>
              <em>Prospect Engine</em>
            </span>
          </Link>
          <p>
            B2B prospecting &amp; partnership engine untuk bisnis lokal Indonesia. Saring prospek sesuai tujuan,
            ambil kontak WhatsApp pengambil keputusan, lalu jalankan outreach sekali klik.
          </p>
          <a href={waLink(WA_MESSAGES.consult)} target="_blank" rel="noreferrer" className="lnd-footer-wa">
            WhatsApp Admin · 0857-8284-6851
          </a>
        </div>

        <nav className="lnd-footer-col" aria-label="Navigasi produk">
          <h4>Produk</h4>
          <a href="#fitur">Fitur Utama</a>
          <a href="#skenario">Skenario Penggunaan</a>
          <a href="#kategori">Kategori Bisnis</a>
          <a href="#harga">Harga Lisensi</a>
          <Link href={DEMO_HREF} prefetch={false}>Demo Interaktif</Link>
        </nav>

        <nav className="lnd-footer-col" aria-label="Navigasi perusahaan">
          <h4>Layanan</h4>
          <a href="#custom">Custom Engine</a>
          <a href="#faq">FAQ</a>
          <Link href="/console/login">Masuk Console</Link>
          <a href={waLink(WA_MESSAGES.customEngine)} target="_blank" rel="noreferrer">
            Konsultasi Engine
          </a>
        </nav>
      </div>

      <div className="lnd-container lnd-footer-bottom">
        <span>© {year} ClientFinder. Seluruh hak cipta dilindungi.</span>
        <span>Data bisnis bersumber dari Google Places API. Penggunaan tunduk pada ketentuan Google.</span>
      </div>
    </footer>
  );
}
