import { randomUUID } from 'node:crypto';
import { getDatabase, normalizeBool, normalizeNumber } from '@/lib/db';
import type { Role } from '@/lib/db/schema';
import { badRequest, conflict, notFound } from '@/lib/errors';
import { hashPassword } from '@/lib/password';
import type { PublicUser } from '@/lib/types';
import type { UserCreateInput, UserUpdateInput } from '@/lib/validation';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  sessionVersion: number;
  createdAt: Date;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  is_active: unknown;
  session_version?: unknown;
  created_at: unknown;
  leads?: unknown;
};

function toRecord(row: UserRow): UserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordHash: String(row.password_hash),
    role: String(row.role) as Role,
    isActive: normalizeBool(row.is_active),
    sessionVersion: normalizeNumber(row.session_version),
    createdAt: new Date(normalizeNumber(row.created_at)),
  };
}

function serialize(record: UserRecord, leads?: number): PublicUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    ...(leads === undefined ? {} : { leads }),
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await getDatabase();
  const row = await db.one<UserRow>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  return row ? toRecord(row) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const db = await getDatabase();
  const row = await db.one<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? toRecord(row) : null;
}

export async function listUsers(): Promise<PublicUser[]> {
  const db = await getDatabase();
  const rows = await db.all<UserRow>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, COUNT(l.id) AS leads
     FROM users u
     LEFT JOIN client_leads l ON l.owner_id = u.id
     GROUP BY u.id, u.email, u.name, u.role, u.is_active, u.created_at
     ORDER BY u.created_at ASC`,
  );
  return rows.map((row) => serialize(toRecord(row), normalizeNumber(row.leads)));
}

async function activeSuperadminCount(excludeId?: string): Promise<number> {
  const db = await getDatabase();
  const row = excludeId
    ? await db.one<{ value: unknown }>(
        'SELECT COUNT(*) AS value FROM users WHERE role = ? AND is_active = TRUE AND id <> ?',
        ['SUPERADMIN', excludeId],
      )
    : await db.one<{ value: unknown }>(
        'SELECT COUNT(*) AS value FROM users WHERE role = ? AND is_active = TRUE',
        ['SUPERADMIN'],
      );
  return normalizeNumber(row?.value);
}

export async function createUser(input: UserCreateInput): Promise<PublicUser> {
  const db = await getDatabase();
  if (await findUserByEmail(input.email)) throw conflict('Email sudah terdaftar.');

  const now = new Date();
  const id = randomUUID();
  await db.run(
    `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`,
    [id, input.email, input.name, await hashPassword(input.password), input.role, now.getTime(), now.getTime()],
  );

  return serialize({
    id,
    email: input.email,
    name: input.name,
    passwordHash: '',
    role: input.role,
    isActive: true,
    sessionVersion: 0,
    createdAt: now,
  }, 0);
}

export async function updateUser(
  actorId: string,
  targetId: string,
  input: UserUpdateInput,
): Promise<PublicUser> {
  const db = await getDatabase();
  const target = await findUserById(targetId);
  if (!target) throw notFound('User tidak ditemukan.');

  if (input.email && input.email !== target.email) {
    const duplicate = await findUserByEmail(input.email);
    if (duplicate && duplicate.id !== targetId) throw conflict('Email sudah dipakai user lain.');
  }

  const nextRole = input.role ?? target.role;
  const nextActive = input.isActive ?? target.isActive;
  const losesSuperadmin = target.role === 'SUPERADMIN' && (nextRole !== 'SUPERADMIN' || !nextActive);

  if (losesSuperadmin) {
    if (target.id === actorId) throw badRequest('Anda tidak bisa menurunkan atau menonaktifkan akun sendiri.');
    if ((await activeSuperadminCount(targetId)) === 0) {
      throw badRequest('Harus ada minimal satu Superadmin aktif.');
    }
  }

  const fields: string[] = [];
  const params: Array<string | number | boolean> = [];
  if (input.email !== undefined) {
    fields.push('email = ?');
    params.push(input.email);
  }
  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.role !== undefined) {
    fields.push('role = ?');
    params.push(input.role);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }
  if (input.role !== undefined || input.isActive !== undefined) {
    // Role/status berubah → cabut sesi lama user tersebut.
    fields.push('session_version = session_version + 1');
  }
  fields.push('updated_at = ?');
  params.push(Date.now());
  params.push(targetId);

  await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  const updated = await findUserById(targetId);
  if (!updated) throw notFound('User tidak ditemukan.');
  return serialize(updated);
}

export async function resetUserPassword(targetId: string, password: string): Promise<void> {
  const db = await getDatabase();
  if (!(await findUserById(targetId))) throw notFound('User tidak ditemukan.');
  await db.run(
    'UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?',
    [
    await hashPassword(password),
    Date.now(),
    targetId,
  ]);
}

export async function deleteUser(actorId: string, targetId: string): Promise<void> {
  const db = await getDatabase();
  const target = await findUserById(targetId);
  if (!target) throw notFound('User tidak ditemukan.');
  if (targetId === actorId) throw badRequest('Anda tidak bisa menghapus akun sendiri.');
  if (target.role === 'SUPERADMIN' && (await activeSuperadminCount(targetId)) === 0) {
    throw badRequest('Harus ada minimal satu Superadmin aktif.');
  }
  await db.run('DELETE FROM users WHERE id = ?', [targetId]);
}

export async function countUsersByRole(): Promise<Record<Role, number>> {
  const db = await getDatabase();
  const rows = await db.all<{ role: string; value: unknown }>(
    'SELECT role, COUNT(*) AS value FROM users WHERE is_active = TRUE GROUP BY role',
  );
  const result: Record<Role, number> = { SUPERADMIN: 0, ADMIN: 0, USER: 0 };
  for (const row of rows) {
    const role = String(row.role) as Role;
    if (role in result) result[role] = normalizeNumber(row.value);
  }
  return result;
}

export async function userExists(id: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.one<{ id: string }>('SELECT id FROM users WHERE id = ?', [id]);
  return Boolean(row);
}
