import { randomUUID } from 'node:crypto';
import type { SqlAdapter } from './postgres';
import { normalizeNumber } from './postgres';
import { DEFAULT_CATEGORIES } from '@/lib/seed';
import { hashPassword, verifyPassword } from '@/lib/password';

/**
 * Bootstrap data produksi (idempotent, dua dialek):
 * 1. Kategori global dari katalog default bila belum ada.
 * 2. Akun Superadmin pertama dari SEED_SUPERADMIN_EMAIL/PASSWORD.
 *
 * Tidak ada password bawaan. Bila env seed kosong, login ditolak sampai
 * kredensial diisi dan server direstart.
 */

let warnedMissingSeed = false;

export async function seedDatabase(db: SqlAdapter): Promise<void> {
  const globalRow = await db.one<{ value: unknown }>(
    'SELECT COUNT(*) AS value FROM categories WHERE is_global = TRUE',
  );
  if (normalizeNumber(globalRow?.value) === 0) {
    const now = Date.now();
    await db.batch(
      DEFAULT_CATEGORIES.map((item) => ({
        sql: `INSERT INTO categories
                (id, owner_id, sector, sub_category, keyword, pitch, is_global, created_at, updated_at)
              VALUES (?, NULL, ?, ?, ?, ?, TRUE, ?, ?)`,
        params: [item.id, item.sector, item.subCategory, item.keyword, item.pitch, now, now],
      })),
    );
  }

  const email = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    if (!warnedMissingSeed) {
      warnedMissingSeed = true;
      console.warn(
        '[bootstrap] SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD belum diset — belum ada akun Superadmin baru.',
      );
    }
    return;
  }

  const existing = await db.one<{ id: string; role: string; password_hash: string; is_active: unknown }>(
    'SELECT id, role, password_hash, is_active FROM users WHERE email = ?',
    [email],
  );

  if (existing) {
    const active = existing.is_active === true || Number(existing.is_active) === 1;
    const passwordMatches = await verifyPassword(password, existing.password_hash);
    if (existing.role !== 'SUPERADMIN' || !active || !passwordMatches) {
      await db.run('UPDATE users SET role = ?, is_active = TRUE, password_hash = ?, updated_at = ? WHERE id = ?', [
        'SUPERADMIN',
        passwordMatches ? existing.password_hash : await hashPassword(password),
        Date.now(),
        existing.id,
      ]);
    }
    return;
  }

  const superadminRow = await db.one<{ value: unknown }>(
    'SELECT COUNT(*) AS value FROM users WHERE role = ? AND is_active = TRUE',
    ['SUPERADMIN'],
  );
  if (normalizeNumber(superadminRow?.value) > 0) return;

  const now = Date.now();
  await db.run(
    `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`,
    [
      randomUUID(),
      email,
      process.env.SEED_SUPERADMIN_NAME?.trim() || 'Superadmin',
      await hashPassword(password),
      'SUPERADMIN',
      now,
      now,
    ],
  );
}
