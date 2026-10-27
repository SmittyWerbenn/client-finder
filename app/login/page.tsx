import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { DEMO } from '@/lib/demo';

// Mode normal dinamis (cookie sesi), mode statis tanpa cookie.

export default async function LoginPage() {
  if (DEMO) {
    return (
      <main className="auth-main" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <h1>Login tidak tersedia di demo</h1>
          <p className="hint">
            Build GitHub Pages bersifat statis: tidak ada sesi maupun password admin. Buka demo
            dashboard untuk mencoba pencarian dan export CSV dengan data contoh.
          </p>
          <Link className="btn btn-primary" href="/dashboard" style={{ marginTop: 16, width: '100%' }}>
            Buka demo dashboard
          </Link>
        </div>
      </main>
    );
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) redirect('/dashboard');

  const configured = Boolean(process.env.APP_ADMIN_PASSWORD?.trim());

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="brand-row">
          <div className="brand-mark">CF</div>
          <div>
            <div className="brand-name">Client Finder</div>
            <div className="brand-sub">Prospect Engine</div>
          </div>
        </div>

        <div>
          <h2 className="auth-headline">
            Temukan bisnis yang <span>belum punya website</span>.
          </h2>
          <p className="auth-lede">
            Data diambil langsung dari Google Maps, difilter otomatis, lalu disiapkan jadi daftar
            prospek siap dihubungi lewat WhatsApp.
          </p>
          <ul className="auth-points">
            <li>
              <span className="dot">1</span>
              <span>Filter ketat: usaha yang sudah punya website otomatis dibuang.</span>
            </li>
            <li>
              <span className="dot">2</span>
              <span>Pitch angle siap pakai sesuai jenis usaha, bukan template generik.</span>
            </li>
            <li>
              <span className="dot">3</span>
              <span>Klik nomor langsung membuka chat WhatsApp, lalu export ke CSV.</span>
            </li>
          </ul>
        </div>

        <div className="auth-foot">
          API key Google Places tetap di server — tidak pernah dikirim ke browser.
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <div className="brand-mark">CF</div>
            <div>
              <div className="brand-name">Client Finder</div>
              <div className="brand-sub">Prospect Engine</div>
            </div>
          </div>

          <h1>Masuk ke dashboard</h1>
          <p className="hint">Gunakan admin password yang tertera pada file .env.local.</p>

          <LoginForm configured={configured} />
        </div>
      </main>
    </div>
  );
}
