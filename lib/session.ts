import { SignJWT, jwtVerify } from 'jose';
import type { Role } from './db/schema';

/**
 * Logika sesi yang aman dipakai di Edge (proxy): hanya `jose`, tanpa akses DB.
 * Sesi disimpan sebagai JWT HS256 di cookie httpOnly.
 */

export const SESSION_COOKIE = 'cf_session';

export const SESSION_TTL_HOURS = (() => {
  const raw = Number(process.env.SESSION_TTL_HOURS);
  if (Number.isFinite(raw) && raw > 0 && raw <= 24 * 30) return raw;
  return 12;
})();

export type SessionClaims = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Sinkron dengan users.session_version; naik saat logout/reset password. */
  ver: number;
};

function secretKey(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'client-finder-development-secret-min-32-characters' : '');
  if (!secret || secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET wajib diisi minimal 32 karakter di production.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role, ver: claims.ver })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const { sub, email, name, role, ver } = payload;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof name !== 'string') return null;
    if (typeof ver !== 'number') return null;
    if (role !== 'SUPERADMIN' && role !== 'ADMIN' && role !== 'USER') return null;
    return { sub, email, name, role, ver };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure = false) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_HOURS * 3600),
  };
}

/** True bila request datang lewat HTTPS (langsung atau reverse proxy). */
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
