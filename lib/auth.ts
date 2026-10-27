import { SignJWT, jwtVerify } from 'jose';

/**
 * Session = JWT HS256 di cookie httpOnly.
 * Hanya berisi { sub: 'admin' } — tidak ada data sensitif di client.
 */

export const SESSION_COOKIE = 'cf_session';

const FALLBACK_SECRET = 'client-finder-dev-secret-change-me-min-32-chars';

export const SESSION_TTL_HOURS = (() => {
  const raw = Number(process.env.SESSION_TTL_HOURS);
  if (Number.isFinite(raw) && raw > 0 && raw <= 24 * 30) return raw;
  return 12;
})();

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET?.trim() || FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload.role === 'admin' && payload.sub === 'admin';
  } catch {
    return false;
  }
}

/**
 * `secure` mengikuti protokol request sebenarnya: kalau aplikasi diakses lewat
 * http (mis. LAN `http://192.168.1.5:3000`), cookie Secure akan ditolak browser
 * dan login tampak "berhasil" tapi selalu balik ke halaman login.
 */
export function sessionCookieOptions(secure = false) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_HOURS * 3600),
  };
}

/** True bila request datang lewat HTTPS (langsung atau via reverse proxy). */
export function requestUsesHttps(req: Request): boolean {
  if (process.env.FORCE_SECURE_COOKIES === 'true') return true;
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (proto) return proto === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}
