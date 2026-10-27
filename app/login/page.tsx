import { cookies } from 'next/headers';
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
  if (await verifySessionToken(token)) redirect('/dashboard');
  const requestedNext = (await searchParams).next;
  const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';

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
            Data diambil langsung dari Google Places, difilter otomatis, lalu disiapkan menjadi daftar
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
              <span>Setiap pencarian tercatat di audit log pemakaian Google Places API.</span>
            </li>
          </ul>
        </div>

        <div className="auth-foot">API key Google Places tetap di server — tidak pernah dikirim ke browser.</div>
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
          <p className="hint">Gunakan email dan password akun yang diberikan oleh Superadmin.</p>

          <LoginForm nextPath={nextPath} />
        </div>
      </main>
    </div>
  );
}
