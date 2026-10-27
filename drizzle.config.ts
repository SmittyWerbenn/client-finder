import type { Config } from 'drizzle-kit';

/** Drizzle Kit: generate migrasi SQLite (default lokal). */
const config: Config = {
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle/sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.trim() || 'file:data/clientfinder.db',
  },
  strict: true,
  verbose: true,
};

export default config;
