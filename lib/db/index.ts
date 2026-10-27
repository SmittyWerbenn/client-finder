import { isPostgresUrl, PostgresAdapter, type Dialect, type SqlAdapter } from './postgres';
import { SqliteAdapter } from './sqlite';
import { ensureMigrated } from './migrate';
import { seedDatabase } from './seed';

export type { SqlAdapter, SqlParam, SqlStatement, SqlRow } from './postgres';
export { normalizeBool, normalizeNumber } from './postgres';

type AdapterGlobal = typeof globalThis & {
  __clientFinderAdapter?: SqlAdapter;
  __clientFinderReady?: Promise<SqlAdapter>;
};

const globalRef = globalThis as AdapterGlobal;

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || 'file:data/clientfinder.db';
}

export function dialect(): Dialect {
  return isPostgresUrl(databaseUrl()) ? 'postgres' : 'sqlite';
}

export function getAdapter(): SqlAdapter {
  if (!globalRef.__clientFinderAdapter) {
    const url = databaseUrl();
    globalRef.__clientFinderAdapter = isPostgresUrl(url)
      ? new PostgresAdapter(url)
      : new SqliteAdapter(url);
  }
  return globalRef.__clientFinderAdapter;
}

/**
 * Adapter siap pakai: migrasi + seed dijalankan sekali per proses sebelum
 * query pertama, apa pun dialek database-nya.
 */
export async function getDatabase(): Promise<SqlAdapter> {
  const adapter = getAdapter();
  if (!globalRef.__clientFinderReady) {
    globalRef.__clientFinderReady = (async () => {
      await ensureMigrated(adapter);
      await seedDatabase(adapter);
      return adapter;
    })().catch((error: unknown) => {
      globalRef.__clientFinderReady = undefined;
      throw error;
    });
  }
  return globalRef.__clientFinderReady;
}
