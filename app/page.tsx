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
            Build statis tanpa server. Dua mode pencarian (kategori &amp; kota atau nama usaha langsung),
            filter rating/telepon/ulasan, multi-user demo dengan kuota kredit, template WhatsApp, pipeline
            status, dan export CSV semuanya berjalan di browser memakai data contoh — tanpa API key.
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
