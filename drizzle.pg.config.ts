import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit: generate migrasi PostgreSQL.
 * `drizzle-kit generate --config drizzle.pg.config.ts` tidak butuh koneksi DB.
 */
const config: Config = {
  dialect: 'postgresql',
  schema: './lib/db/schema.pg.ts',
  out: './drizzle/postgres',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_PG?.trim() ||
      'postgres://postgres:postgres@localhost:5432/clientfinder',
  },
  strict: true,
  verbose: true,
};

export default config;
