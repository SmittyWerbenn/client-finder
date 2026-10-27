import { getDatabase, normalizeBool, normalizeNumber } from '@/lib/db';
import { badRequest, conflict, forbidden, notFound } from '@/lib/errors';
import type { SessionUser } from '@/lib/auth';
import type { Category } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/seed';
import type { CategoryInput } from '@/lib/validation';
import { userExists } from './users';

type CategoryRow = {
  id: string;
  owner_id: string | null;
  owner_name?: string | null;
  sector: string;
  sub_category: string;
  keyword: string;
  pitch: string;
  is_global: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function serialize(row: CategoryRow): Category {
  return {
    id: String(row.id),
    ownerId: row.owner_id === null ? null : String(row.owner_id),
    ownerName: row.owner_name ?? null,
    sector: String(row.sector),
    subCategory: String(row.sub_category),
    keyword: String(row.keyword),
    pitch: String(row.pitch),
    isGlobal: normalizeBool(row.is_global),
    createdAt: new Date(normalizeNumber(row.created_at)).toISOString(),
    updatedAt: new Date(normalizeNumber(row.updated_at)).toISOString(),
  };
}

function canAccess(user: SessionUser, row: Pick<CategoryRow, 'owner_id' | 'is_global'>): boolean {
  if (user.role === 'SUPERADMIN') return true;
  if (row.owner_id === user.id) return true;
  return user.role === 'ADMIN' && normalizeBool(row.is_global);
}

function canModify(user: SessionUser, row: Pick<CategoryRow, 'owner_id' | 'is_global'>): boolean {
  if (user.role === 'SUPERADMIN') return true;
  return row.owner_id === user.id && !normalizeBool(row.is_global);
}

/** Superadmin semua; Admin global + miliknya; User hanya miliknya. */
export async function listCategoriesFor(user: SessionUser): Promise<Category[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: string[] = [];

  if (user.role === 'USER') {
    clauses.push('c.owner_id = ?');
    params.push(user.id);
  } else if (user.role === 'ADMIN') {
    clauses.push('(c.is_global = TRUE OR c.owner_id = ?)');
    params.push(user.id);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.all<CategoryRow>(
    `SELECT c.*, u.name AS owner_name
     FROM categories c
     LEFT JOIN users u ON u.id = c.owner_id
     ${where}
     ORDER BY c.sector ASC, c.sub_category ASC`,
    params,
  );
  return rows.map(serialize);
}

async function findCategoryRow(id: string): Promise<CategoryRow | null> {
  const db = await getDatabase();
  return db.one<CategoryRow>(
    `SELECT c.*, u.name AS owner_name
     FROM categories c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.id = ?`,
    [id],
  );
}

export async function getCategoryFor(user: SessionUser, id: string): Promise<Category> {
  const row = await findCategoryRow(id);
  if (!row) throw notFound('Kategori tidak ditemukan.');
  if (!canAccess(user, row)) throw forbidden('Kategori ini bukan milik akun Anda.');
  return serialize(row);
}

async function assertUnique(
  ownerId: string | null,
  sector: string,
  subCategory: string,
  excludeId?: string,
): Promise<void> {
  const db = await getDatabase();
  const clauses = [
    ownerId === null ? 'owner_id IS NULL' : 'owner_id = ?',
    'lower(sector) = lower(?)',
    'lower(sub_category) = lower(?)',
  ];
  const params: Array<string | null> = [ownerId, sector, subCategory];
  if (excludeId) {
    clauses.push('id <> ?');
    params.push(excludeId);
  }
  const row = await db.one<{ id: string }>(
    `SELECT id FROM categories WHERE ${clauses.join(' AND ')} LIMIT 1`,
    params,
  );
  if (row) throw conflict('Sub-kategori pada sektor tersebut sudah ada.');
}

async function resolveOwner(
  user: SessionUser,
  requestedOwnerId: string | null | undefined,
): Promise<{ ownerId: string | null; isGlobal: boolean }> {
  if (user.role !== 'SUPERADMIN') return { ownerId: user.id, isGlobal: false };
  if (requestedOwnerId === undefined || requestedOwnerId === null) return { ownerId: null, isGlobal: true };
  if (!(await userExists(requestedOwnerId))) throw badRequest('User pemilik kategori tidak ditemukan.');
  return { ownerId: requestedOwnerId, isGlobal: false };
}

export async function createCategory(user: SessionUser, input: CategoryInput): Promise<Category> {
  const db = await getDatabase();
  const owner = await resolveOwner(user, input.ownerId);
  await assertUnique(owner.ownerId, input.sector, input.subCategory);

  const now = Date.now();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO categories
       (id, owner_id, sector, sub_category, keyword, pitch, is_global, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, owner.ownerId, input.sector, input.subCategory, input.keyword, input.pitch, owner.isGlobal, now, now],
  );
  return getCategoryFor(user, id);
}

export async function updateCategory(user: SessionUser, id: string, input: CategoryInput): Promise<Category> {
  const db = await getDatabase();
  const current = await findCategoryRow(id);
  if (!current) throw notFound('Kategori tidak ditemukan.');
  if (!canAccess(user, current)) throw forbidden('Kategori ini bukan milik akun Anda.');
  if (!canModify(user, current)) throw forbidden('Kategori global hanya dapat diubah Superadmin.');

  const owner =
    user.role === 'SUPERADMIN' && input.ownerId !== undefined
      ? await resolveOwner(user, input.ownerId)
      : { ownerId: current.owner_id, isGlobal: normalizeBool(current.is_global) };

  await assertUnique(owner.ownerId, input.sector, input.subCategory, id);

  await db.run(
    `UPDATE categories
     SET owner_id = ?, is_global = ?, sector = ?, sub_category = ?, keyword = ?, pitch = ?, updated_at = ?
     WHERE id = ?`,
    [
      owner.ownerId,
      owner.isGlobal,
      input.sector,
      input.subCategory,
      input.keyword,
      input.pitch,
      Date.now(),
      id,
    ],
  );
  return getCategoryFor(user, id);
}

export async function deleteCategory(user: SessionUser, id: string): Promise<void> {
  const db = await getDatabase();
  const row = await findCategoryRow(id);
  if (!row) throw notFound('Kategori tidak ditemukan.');
  if (!canAccess(user, row)) throw forbidden('Kategori ini bukan milik akun Anda.');
  if (!canModify(user, row)) throw forbidden('Kategori global hanya dapat dihapus Superadmin.');
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
}

/** Pulihkan katalog global yang hilang (khusus Superadmin). */
export async function restoreGlobalCategories(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.all<{ id: string }>('SELECT id FROM categories WHERE is_global = TRUE');
  const existing = new Set(rows.map((row) => String(row.id)));
  const missing = DEFAULT_CATEGORIES.filter((item) => !existing.has(item.id));
  if (missing.length === 0) return;

  const now = Date.now();
  await db.batch(
    missing.map((item) => ({
      sql: `INSERT INTO categories
              (id, owner_id, sector, sub_category, keyword, pitch, is_global, created_at, updated_at)
            VALUES (?, NULL, ?, ?, ?, ?, TRUE, ?, ?)`,
      params: [item.id, item.sector, item.subCategory, item.keyword, item.pitch, now, now],
    })),
  );
}
