import { NextRequest, NextResponse } from 'next/server';
import { DEMO_ALIAS_COOKIE, DEMO_COOKIE, DEMO_COOKIE_MAX_AGE } from '@/lib/demo-cookie';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

/**
 * Proxy (Next.js 16, pengganti `middleware`) — routing publik + RBAC lapis pertama.
 *
 * - `/` (landing page), `/console/login`, `/api/auth/login`, `/api/health` publik.
 * - `/dashboard/**` dan `/login` diarahkan permanen ke `/console/**` & `/console/login`.
 * - `/console?mode=demo` membuka console read-only tanpa login (cookie `cf_demo`).
 * - `/console/**` lain wajib sesi; RBAC halaman diperiksa di sini lalu DIPERIKSA
 *   ULANG di route handler (role di JWT bisa basi bila user diubah).
 */

const PUBLIC_APIS = new Set([
  '/api/auth/login',
  '/api/health',
  // Checkout paket berbayar (pengunjung belum punya akun) + webhook DOKU.
  '/api/checkout',
  '/api/doku/notification',
]);
/** Status order dibaca halaman /checkout/status tanpa sesi (hanya field publik). */
const PUBLIC_API_PREFIXES = ['/api/orders/'];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_APIS.has(pathname) || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function redirectLegacy(req: NextRequest, targetPath: string): NextResponse {
  const url = new URL(targetPath, req.url);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

function denyPage(req: NextRequest): NextResponse {
  const url = new URL('/console', req.url);
  url.searchParams.set('denied', '1');
  return NextResponse.redirect(url);
}

function demoCookie(response: NextResponse, enabled: boolean): NextResponse {
  const names = [DEMO_COOKIE, DEMO_ALIAS_COOKIE];
  for (const name of names) {
    if (enabled) {
      response.cookies.set(name, name === DEMO_ALIAS_COOKIE ? 'true' : '1', {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: DEMO_COOKIE_MAX_AGE,
      });
    } else {
      response.cookies.set(name, '', { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 0 });
    }
  }
  return response;
}

/** Prefetch Next.js tidak boleh menanam cookie demo / meng-cache hasil redirect login. */
function isPrefetch(req: NextRequest): boolean {
  return (
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.get('x-middleware-prefetch') === '1' ||
    req.headers.get('purpose') === 'prefetch'
  );
}

/**
 * Tanam cookie demo pada REQUEST (bukan hanya response) supaya layout server
 * pada request RSC yang sama sudah melihat `isDemoMode()` = true. Tanpa ini,
 * klik `<Link href="/console?mode=demo">` (navigasi RSC) akan ditolak layout
 * dan pengunjung terlempar kembali ke /console/login.
 */
function enterDemo(req: NextRequest): NextResponse {
  req.cookies.set(DEMO_COOKIE, '1');
  req.cookies.set(DEMO_ALIAS_COOKIE, 'true');
  return demoCookie(NextResponse.next({ request: { headers: req.headers } }), true);
}

const DEMO_BLOCKED_PAGES = ['/console/leads', '/console/api-usage', '/console/users'];

export default async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const demoParam = searchParams.get('mode') === 'demo';

  // ── Kompatibilitas URL lama ─────────────────────────────────────
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return redirectLegacy(req, '/console/login');
  }
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return redirectLegacy(req, `/console${pathname.slice('/dashboard'.length)}`);
  }

  // ── Keluar dari mode demo ───────────────────────────────────────
  if (pathname.startsWith('/console') && searchParams.get('mode') === 'exit') {
    return demoCookie(NextResponse.redirect(new URL('/', req.url)), false);
  }

  if (isPublicApi(pathname)) return NextResponse.next();
  if (pathname === '/') return NextResponse.next();

  // ── Halaman login console ───────────────────────────────────────
  // Catatan: cookie demo JANGAN dihapus di sini. Prefetch Next.js ke tautan
  // "Login" akan memicu request ini dan bisa mematikan mode demo yang aktif.
  if (pathname === '/console/login') {
    if (session) return NextResponse.redirect(new URL('/console', req.url));
    return NextResponse.next();
  }

  // ── Tanpa sesi ──────────────────────────────────────────────────
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid. Silakan login ulang.' } },
        { status: 401 },
      );
    }

    const demoCookieActive = req.cookies.get(DEMO_COOKIE)?.value === '1';
    if (pathname.startsWith('/console') && (demoParam || demoCookieActive)) {
      if (isPrefetch(req)) return NextResponse.next();
      if (DEMO_BLOCKED_PAGES.some((path) => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/console?mode=demo', req.url));
      }
      if (demoParam) return enterDemo(req);
      return NextResponse.next();
    }

    const loginUrl = new URL('/console/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Sesi aktif tetapi membuka tautan demo → pakai console penuh.
  if (pathname.startsWith('/console') && demoParam) {
    return demoCookie(NextResponse.redirect(new URL('/console', req.url)), false);
  }
  // Sesi aktif + sisa cookie demo (mis. setelah login) → bersihkan.
  if (pathname.startsWith('/console') && req.cookies.get(DEMO_COOKIE)?.value === '1') {
    return demoCookie(NextResponse.next(), false);
  }

  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPERADMIN';

  // ── Rute halaman ────────────────────────────────────────────────
  if (pathname === '/console/users' && session.role !== 'SUPERADMIN') {
    return denyPage(req);
  }
  if (
    (pathname.startsWith('/console/leads') ||
      pathname.startsWith('/console/api-usage') ||
      pathname.startsWith('/console/users')) &&
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
  matcher: ['/', '/login', '/dashboard/:path*', '/console/:path*', '/api/:path*'],
};
