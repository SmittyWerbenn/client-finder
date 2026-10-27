#!/usr/bin/env node
/**
 * Menjalankan migrasi Drizzle tanpa boot Next.js — dipakai saat deploy
 * (Docker entrypoint / CI) untuk SQLite maupun PostgreSQL.
 *
 *   DATABASE_URL=file:data/clientfinder.db npm run db:migrate
 *   DATABASE_URL=postgres://user:pass@host:5432/db npm run db:migrate
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const url = process.env.DATABASE_URL?.trim() || 'file:data/clientfinder.db';
const isPg = /^postgres(ql)?:\/\//i.test(url);
const dialect = isPg ? 'postgres' : 'sqlite';
const dir = path.join(process.cwd(), 'drizzle', dialect);

if (!existsSync(dir)) {
  console.error(`[migrate] folder ${dir} tidak ditemukan`);
  process.exit(1);
}

function statementsOf(file) {
  return readFileSync(path.join(dir, file), 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function toPgPlaceholders(sql) {
  let index = 0;
  let inString = false;
  let out = '';
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (char === "'") {
      if (inString && sql[i + 1] === "'") {
        out += "''";
        i += 1;
        continue;
      }
      inString = !inString;
      out += char;
      continue;
    }
    if (char === '?' && !inString) {
      index += 1;
      out += `$${index}`;
      continue;
    }
    out += char;
  }
  return out;
}

async function main() {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (isPg) {
    const { Pool, types } = await import('pg');
    types.setTypeParser(20, (value) => Number(value));
    const pool = new Pool({
      connectionString: url,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    const client = await pool.connect();
    try {
      await client.query(
        'CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)',
      );
      const applied = new Set((await client.query('SELECT name FROM __migrations')).rows.map((row) => row.name));
      for (const file of files) {
        if (applied.has(file)) continue;
        await client.query('BEGIN');
        try {
          for (const statement of statementsOf(file)) {
            await client.query(toPgPlaceholders(statement));
          }
          await client.query('INSERT INTO __migrations (name, applied_at) VALUES ($1, $2)', [file, Date.now()]);
          await client.query('COMMIT');
          console.log(`[migrate:postgres] applied ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      client.release();
      await pool.end();
    }
    return;
  }

  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
  });
  await client.execute(
    'CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)',
  );
  const applied = new Set((await client.execute('SELECT name FROM __migrations')).rows.map((row) => String(row.name)));
  for (const file of files) {
    if (applied.has(file)) continue;
    const batch = statementsOf(file).map((statement) => ({ sql: statement, args: [] }));
    batch.push({ sql: 'INSERT INTO __migrations (name, applied_at) VALUES (?, ?)', args: [file, Date.now()] });
    await client.batch(batch, 'write');
    console.log(`[migrate:sqlite] applied ${file}`);
  }
}

main().catch((error) => {
  console.error('[migrate] gagal:', error);
  process.exit(1);
});
