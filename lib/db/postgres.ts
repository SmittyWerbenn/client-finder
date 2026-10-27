import type { Pool, PoolClient } from 'pg';

/**
 * Lapisan SQL portabel untuk dua dialek:
 * - SQLite/libSQL (default, `DATABASE_URL=file:...`)
 * - PostgreSQL (`DATABASE_URL=postgres://...`)
 *
 * Repository memakai SATU bentuk SQL (`?` placeholder, integer epoch ms) dan
 * adapter yang menyesuaikan placeholder + tipe boolean. Dengan begitu logika
 * bisnis tidak bercabang per database.
 */

export type Dialect = 'sqlite' | 'postgres';
export type SqlParam = string | number | boolean | null;

export type SqlStatement = {
  sql: string;
  params?: SqlParam[];
};

export type SqlRow = Record<string, unknown>;

export interface SqlAdapter {
  readonly dialect: Dialect;
  all<T extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<T[]>;
  one<T extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<T | null>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  batch(statements: SqlStatement[]): Promise<void>;
}

export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//i.test(url.trim());
}

/** Ubah `?` menjadi `$n` untuk PostgreSQL, tanpa menyentuh tanda tanya di literal string. */
export function toPgPlaceholders(sql: string): string {
  let index = 0;
  let inString = false;
  let output = '';

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (char === "'") {
      if (inString && sql[i + 1] === "'") {
        output += "''";
        i += 1;
        continue;
      }
      inString = !inString;
      output += char;
      continue;
    }
    if (char === '?' && !inString) {
      index += 1;
      output += `$${index}`;
      continue;
    }
    output += char;
  }
  return output;
}

type PgGlobal = typeof globalThis & { __clientFinderPgPool?: Pool };
const pgGlobal = globalThis as PgGlobal;

export class PostgresAdapter implements SqlAdapter {
  readonly dialect = 'postgres' as const;

  constructor(private readonly connectionString: string) {}

  private async pool(): Promise<Pool> {
    if (!pgGlobal.__clientFinderPgPool) {
      const { Pool: PgPool, types } = await import('pg');
      // BIGINT (OID 20) → number; semua timestamp disimpan sebagai epoch ms.
      types.setTypeParser(20, (value: string) => Number(value));
      pgGlobal.__clientFinderPgPool = new PgPool({
        connectionString: this.connectionString,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
    }
    return pgGlobal.__clientFinderPgPool;
  }

  async all<T extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const result = await (await this.pool()).query(toPgPlaceholders(sql), params);
    return result.rows as T[];
  }

  async one<T extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params);
    return rows[0] ?? null;
  }

  async run(sql: string, params: SqlParam[] = []): Promise<void> {
    await (await this.pool()).query(toPgPlaceholders(sql), params);
  }

  async batch(statements: SqlStatement[]): Promise<void> {
    if (statements.length === 0) return;
    const client: PoolClient = await (await this.pool()).connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) {
        await client.query(toPgPlaceholders(statement.sql), statement.params ?? []);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

export function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 't';
}

export function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
