import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SqlAdapter, SqlStatement } from './postgres';

/**
 * Migrator idempotent untuk kedua dialek:
 * - SQLite   → drizzle/sqlite/*.sql
 * - Postgres → drizzle/postgres/*.sql
 *
 * File diterapkan berurutan dan dicatat di tabel `__migrations`. Dijalankan
 * otomatis saat bootstrap sehingga deployment baru tidak butuh langkah manual.
 */

const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

type MigrationGlobal = typeof globalThis & { __clientFinderMigrated?: Promise<void> };
const globalRef = globalThis as MigrationGlobal;

export function migrationsDir(dialectName: 'sqlite' | 'postgres'): string {
  if (process.env.DB_MIGRATIONS_DIR?.trim()) return process.env.DB_MIGRATIONS_DIR.trim();
  return path.join(process.cwd(), 'drizzle', dialectName);
}

export async function runMigrations(adapter: SqlAdapter): Promise<void> {
  const dir = migrationsDir(adapter.dialect);

  await adapter.run(
    'CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)',
  );

  if (!existsSync(/* turbopackIgnore: true */ dir)) {
    throw new Error(
      `Folder migrasi ${adapter.dialect} tidak ditemukan: ${dir}. Jalankan "npm run db:generate" lalu deploy ulang.`,
    );
  }

  const appliedRows = await adapter.all<{ name: string }>('SELECT name FROM __migrations');
  const applied = new Set(appliedRows.map((row) => String(row.name)));

  const files = readdirSync(/* turbopackIgnore: true */ dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(/* turbopackIgnore: true */ path.join(dir, file), 'utf8');
    const statements: SqlStatement[] = sql
      .split(STATEMENT_BREAKPOINT)
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => ({ sql: statement }));

    if (statements.length === 0) continue;
    await adapter.batch([
      ...statements,
      { sql: 'INSERT INTO __migrations (name, applied_at) VALUES (?, ?)', params: [file, Date.now()] },
    ]);
  }
}

/** Pastikan migrasi hanya berjalan sekali per proses (hot reload aman). */
export function ensureMigrated(adapter: SqlAdapter): Promise<void> {
  if (!globalRef.__clientFinderMigrated) {
    globalRef.__clientFinderMigrated = runMigrations(adapter).catch((error: unknown) => {
      globalRef.__clientFinderMigrated = undefined;
      throw error;
    });
  }
  return globalRef.__clientFinderMigrated;
}
