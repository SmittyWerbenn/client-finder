import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { DEMO } from '@/lib/demo';

// Mode normal tetap dinamis karena membaca cookie sesi (`cookies()`),
// sementara mode statis (GitHub Pages) tidak menyentuh cookie sama sekali.

export default async function Home() {
  if (DEMO) {
    return (
      <main className="auth-main" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <div className="brand-row">
            <div className="brand-mark">CF</div>
            <div>
              <div className="brand-name">Client Finder</div>
              <div className="brand-sub">Prospect Engine</div>
            </div>
          </div>
          <h1>Demo statis</h1>
          <p className="hint">
            Halaman ini adalah build statis untuk GitHub Pages. Pencarian, filter &quot;tanpa
            website&quot;, dan export CSV berjalan penuh di browser memakai data contoh —
            aplikasi penuh (Places API asli, kategori, login) butuh Node server.
          </p>
          <Link className="btn btn-primary" href="/dashboard" style={{ marginTop: 16, width: '100%' }}>
            Buka demo dashboard
          </Link>
        </div>
      </main>
    );
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  redirect(session ? '/dashboard' : '/login');
}
