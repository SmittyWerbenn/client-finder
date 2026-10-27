import { NextResponse } from 'next/server';
import { apiOk, runApi } from '@/lib/http';
import { getDatabase } from '@/lib/db';
import { SESSION_COOKIE, requestUsesHttps, sessionCookieOptions, verifySessionToken } from '@/lib/session';

function sessionFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/**
 * Logout: cabut seluruh sesi user dengan menaikkan `session_version`, lalu
 * hapus cookie. JWT lama yang masih dipegang klien langsung tidak valid.
 */
export async function POST(req: Request) {
  return runApi(async () => {
    const token = sessionFromCookieHeader(req.headers.get('cookie'));
    const claims = await verifySessionToken(token);

    if (claims) {
      const db = await getDatabase();
      await db.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [claims.sub]);
    }

    const response = apiOk({ loggedOut: true }) as NextResponse;
    response.cookies.set(SESSION_COOKIE, '', {
      ...sessionCookieOptions(requestUsesHttps(req)),
      maxAge: 0,
    });
    return response;
  });
}
