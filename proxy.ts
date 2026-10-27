import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

/**
 * Proxy (Next.js 16, pengganti `middleware`) — RBAC lapis pertama.
 *
 * - Halaman: /dashboard/** harus login; /dashboard/users → SUPERADMIN;
 *   /dashboard/leads & /dashboard/api-usage → ADMIN/SUPERADMIN.
 * - API: /api/auth/login publik; endpoint admin diperiksa role di sini,
 *   lalu DIPERIKSA ULANG di route handler (defense in depth, karena role di
 *   JWT bisa basi bila user diubah/dinonaktifkan).
 */

const PUBLIC_PAGES = new Set(['/login']);
const PUBLIC_APIS = new Set(['/api/auth/login', '/api/health']);

function denyPage(req: NextRequest): NextResponse {
  const url = new URL('/dashboard', req.url);
  url.searchParams.set('denied', '1');
  return NextResponse.redirect(url);
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (PUBLIC_PAGES.has(pathname)) {
    return session ? NextResponse.redirect(new URL('/dashboard', req.url)) : NextResponse.next();
  }

  if (PUBLIC_APIS.has(pathname)) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid. Silakan login ulang.' } },
        { status: 401 },
      );
    }
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPERADMIN';

  // ── Rute halaman ────────────────────────────────────────────────
  if (pathname === '/dashboard/users' && session.role !== 'SUPERADMIN') {
    return denyPage(req);
  }
  if (
    (pathname.startsWith('/dashboard/leads') ||
      pathname.startsWith('/dashboard/api-usage') ||
      pathname.startsWith('/dashboard/users')) &&
    !isAdmin
  ) {
    return denyPage(req);
  }

  // ── Rute API ────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin/users') && session.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya Superadmin yang dapat mengelola user.' } },
      { status: 403 },
    );
  }
  if (pathname.startsWith('/api/admin/usage') && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'Metrik API hanya untuk Admin/Superadmin.' } },
      { status: 403 },
    );
  }
  if (pathname === '/api/categories/reset' && session.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya Superadmin yang dapat memulihkan katalog global.' } },
      { status: 403 },
    );
  }
  if (pathname.startsWith('/api/leads') && (req.method === 'POST' || req.method === 'DELETE') && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: 'User tidak boleh menambah/menghapus lead.' } },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
