import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { LeadStatus, Role } from './schema';

/**
 * Skema PostgreSQL — cermin 1:1 dari `schema.ts` (SQLite).
 * Dipakai `drizzle-kit generate` untuk migrasi `drizzle/postgres/*.sql`.
 *
 * Timestamp tetap BIGINT epoch-ms dan boolean native; layer repository
 * menormalkan nilai sehingga SQL yang sama berjalan di kedua dialek.
 */

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<Role>().notNull().default('USER'),
    isActive: boolean('is_active').notNull().default(true),
    sessionVersion: integer('session_version').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email), index('users_role_idx').on(table.role)],
);

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
    sector: text('sector').notNull(),
    subCategory: text('sub_category').notNull(),
    keyword: text('keyword').notNull(),
    pitch: text('pitch').notNull(),
    isGlobal: boolean('is_global').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [index('categories_owner_idx').on(table.ownerId), index('categories_sector_idx').on(table.sector)],
);

export const clientLeads = pgTable(
  'client_leads',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    placeId: text('place_id').notNull(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    phoneRaw: text('phone_raw'),
    phoneDisplay: text('phone_display'),
    whatsapp: text('whatsapp'),
    website: text('website'),
    rating: doublePrecision('rating'),
    reviews: integer('reviews').notNull().default(0),
    mapsUrl: text('maps_url').notNull(),
    sector: text('sector').notNull(),
    subCategory: text('sub_category').notNull(),
    pitch: text('pitch').notNull(),
    status: text('status').$type<LeadStatus>().notNull().default('New'),
    source: text('source').$type<'SEARCH' | 'MANUAL'>().notNull().default('SEARCH'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('client_leads_owner_place_unique').on(table.ownerId, table.placeId),
    index('client_leads_owner_idx').on(table.ownerId),
    index('client_leads_status_idx').on(table.status),
  ],
);

export const apiUsageLogs = pgTable(
  'api_usage_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').$type<'TEXT_SEARCH' | 'PLACE_DETAILS'>().notNull(),
    queryParam: text('query_param').notNull(),
    status: text('status').$type<'SUCCESS' | 'ERROR'>().notNull(),
    httpStatus: integer('http_status'),
    placeId: text('place_id'),
    durationMs: integer('duration_ms').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('api_usage_logs_created_idx').on(table.createdAt),
    index('api_usage_logs_user_idx').on(table.userId),
  ],
);

export const apiUsageCounters = pgTable(
  'api_usage_counters',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    hits: integer('hits').notNull().default(0),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.period] })],
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    planId: text('plan_id').notNull(),
    planName: text('plan_name').notNull(),
    amount: integer('amount').notNull(),
    status: text('status').notNull().default('PENDING'),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    company: text('company'),
    dokuPaymentUrl: text('doku_payment_url'),
    dokuTokenId: text('doku_token_id'),
    dokuRequestId: text('doku_request_id'),
    channel: text('channel'),
    paidAt: bigint('paid_at', { mode: 'number' }),
    expiresAt: bigint('expires_at', { mode: 'number' }),
    notificationPayload: text('notification_payload'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('orders_invoice_unique').on(table.invoiceNumber),
    index('orders_status_idx').on(table.status),
    index('orders_created_idx').on(table.createdAt),
  ],
);
