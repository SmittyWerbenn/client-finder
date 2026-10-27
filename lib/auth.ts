import { cookies } from 'next/headers';
import { getDatabase, normalizeBool, normalizeNumber } from './db';
import type { Role } from './db/schema';
import { HttpError } from './errors';
import { SESSION_COOKIE, verifySessionToken } from './session';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export { ROLE_LABELS, isAdmin, canManageUsers } from './roles';

/**
 * Baca sesi dari cookie lalu verifikasi ulang ke database (role & status
 * aktif terbaru). Jika user dinonaktifkan/diubah role, sesi lama tidak lagi
 * memberi hak akses.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const db = await getDatabase();
  const row = await db.one<{
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: unknown;
    session_version: unknown;
  }>(
    'SELECT id, email, name, role, is_active, session_version FROM users WHERE id = ? AND is_active = TRUE',
    [claims.sub],
  );
  if (!row || !normalizeBool(row.is_active)) return null;
  if (normalizeNumber(row.session_version) !== claims.ver) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: String(row.role) as Role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new HttpError(403, 'FORBIDDEN', 'Role akun ini tidak punya akses ke fitur tersebut.');
  }
  return user;
}
