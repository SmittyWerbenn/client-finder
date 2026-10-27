import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE, createSessionToken, requestUsesHttps, sessionCookieOptions } from '@/lib/auth';

type Attempt = { count: number; first: number };
const globalRef = globalThis as unknown as { __clientFinderLoginAttempts?: Map<string, Attempt> };
const attempts = globalRef.__clientFinderLoginAttempts ?? new Map<string, Attempt>();
globalRef.__clientFinderLoginAttempts = attempts;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Tetap jalankan perbandingan agar durasi tidak membocorkan panjang password.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 10 menit.' },
      { status: 429 },
    );
  }

  const expected = process.env.APP_ADMIN_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: 'APP_ADMIN_PASSWORD belum diset di .env.local. Salin dari .env.example lalu restart server.',
      },
      { status: 500 },
    );
  }

  let password = '';
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Body request tidak valid.' }, { status: 400 });
  }

  if (!password || !safeEqual(password, expected)) {
    return NextResponse.json({ ok: false, error: 'Password salah. Silakan coba lagi.' }, { status: 401 });
  }

  attempts.delete(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(requestUsesHttps(req)));
  return res;
}
