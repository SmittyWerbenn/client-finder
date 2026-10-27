import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { SqlAdapter, SqlParam, SqlRow, SqlStatement } from './postgres';

/** Adapter SQLite/libSQL (default lokal). Boolean disimpan sebagai 0/1. */

type ClientGlobal = typeof globalThis & { __clientFinderClient?: Client };
const globalRef = globalThis as ClientGlobal;

function ensureLocalDirectory(url: string): void {
  if (!url.startsWith('file:')) return;
  const filePath = url.slice('file:'.length).replace(/^\/\//, '');
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
}

function toSqliteParam(value: SqlParam): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

export class SqliteAdapter implements SqlAdapter {
  readonly dialect = 'sqlite' as const;

  constructor(private readonly url: string) {}

  private client(): Client {
    if (!globalRef.__clientFinderClient) {
      ensureLocalDirectory(this.url);
      globalRef.__clientFinderClient = createClient({
        url: this.url,
        authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      });
    }
    return globalRef.__clientFinderClient;
  }

  async all<T extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const result = await this.client().execute({
      sql,
      args: params.map(toSqliteParam),
    });
    return result.rows.map((row) => ({ ...row })) as unknown as T[];
  }

  async one<T extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params);
    return rows[0] ?? null;
  }

  async run(sql: string, params: SqlParam[] = []): Promise<void> {
    await this.client().execute({ sql, args: params.map(toSqliteParam) });
  }

  async batch(statements: SqlStatement[]): Promise<void> {
    if (statements.length === 0) return;
    await this.client().batch(
      statements.map((statement) => ({
        sql: statement.sql,
        args: (statement.params ?? []).map(toSqliteParam),
      })),
      'write',
    );
  }
}
