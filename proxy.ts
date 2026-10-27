import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/**
 * Proxy (pengganti `middleware` di Next.js 16) — proteksi global:
 * - /dashboard/**          → redirect ke /login bila belum ada session valid
 * - /api/** (kecuali login) → 401 JSON bila belum ada session valid
 */

const PUBLIC_API = new Set(['/api/auth/login']);
const PUBLIC_PAGES = new Set(['/login']);

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  // Halaman /login: kalau sudah login, langsung ke dashboard.
  if (PUBLIC_PAGES.has(pathname)) {
    if (authed) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }

  if (PUBLIC_API.has(pathname)) return NextResponse.next();
  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL('/login', req.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
