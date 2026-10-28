import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) redirect('/console');
  const requestedNext = (await searchParams).next;
  const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/console';

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

        <div className="auth-copy">
          <h2 className="auth-headline">
            Temukan calon klien &amp; <span>partner bisnis lokal</span>.
          </h2>
          <p className="auth-lede">
            Data diambil langsung dari Google Places, disaring sesuai tujuan Anda, lalu disiapkan menjadi daftar
            prospek siap dihubungi lewat WhatsApp.
          </p>
          <ul className="auth-points">
            <li>
              <span className="dot">1</span>
              <span>Filter status website fleksibel: semua bisnis, tanpa website, atau sudah punya website.</span>
            </li>
            <li>
              <span className="dot">2</span>
              <span>Pitch angle siap pakai sesuai jenis usaha dan tujuan penawaran, bukan template generik.</span>
            </li>
            <li>
              <span className="dot">3</span>
              <span>Setiap pencarian tercatat di audit log pemakaian Google Places API.</span>
            </li>
          </ul>
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

          <h1>Masuk ke console</h1>
          <p className="hint">Gunakan email dan password akun yang diberikan oleh Superadmin.</p>

          <LoginForm nextPath={nextPath} />

          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' }}>
            Belum punya akses?{' '}
            <Link href="/console?mode=demo" style={{ fontWeight: 600 }}>
              Coba demo gratis
            </Link>{' '}
            atau{' '}
            <a href="https://wa.me/6285782846851?text=Halo%20Admin%2C%20saya%20ingin%20tanya%20paket%20ClientFinder." target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
              hubungi admin
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
