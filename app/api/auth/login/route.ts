import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/password';
import { apiOk, runApi } from '@/lib/http';
import { HttpError } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';
import { clientIp, consumeRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE, createSessionToken, requestUsesHttps, sessionCookieOptions } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Login email + password. Rate limit 8 percobaan / 10 menit per IP + email. */
export async function POST(req: Request) {
  return runApi(async () => {
    const input = loginSchema.parse(await req.json());
    const key = `login:${clientIp(req)}:${input.email}`;

    if (!consumeRateLimit(key, 8, 10 * 60 * 1000)) {
      throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan login. Coba lagi dalam 10 menit.');
    }

    const user = await findUserByEmail(input.email);
    const passwordOk = user ? await verifyPassword(input.password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
    }
    if (!user.isActive) {
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'Akun ini dinonaktifkan. Hubungi Superadmin.');
    }

    resetRateLimit(key);
    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ver: user.sessionVersion,
    });

    const response = apiOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }) as NextResponse;
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(requestUsesHttps(req)));
    return response;
  });
}
