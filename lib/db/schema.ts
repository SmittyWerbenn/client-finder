import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Skema database ClientFinder (Drizzle ORM / SQLite-compatible).
 *
 * Nilai role disimpan sebagai TEXT dan divalidasi di layer aplikasi
 * (`RoleSchema`). SQLite tidak punya tipe ENUM native; PostgreSQL/SQLite
 * memakai kontrak yang sama sehingga migrasi ke Postgres cukup mengganti
 * driver + tipe kolom.
 */

export const ROLES = ['SUPERADMIN', 'ADMIN', 'USER'] as const;
export type Role = (typeof ROLES)[number];

export const LEAD_STATUSES_DB = ['New', 'Contacted', 'Interested', 'Closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES_DB)[number];

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<Role>().notNull().default('USER'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    /** Dinaikkan saat logout / reset password untuk mencabut JWT lama. */
    sessionVersion: integer('session_version').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email), index('users_role_idx').on(table.role)],
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    /** null = kategori global (dikelola Superadmin). */
    ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
    sector: text('sector').notNull(),
    subCategory: text('sub_category').notNull(),
    keyword: text('keyword').notNull(),
    pitch: text('pitch').notNull(),
    isGlobal: integer('is_global', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('categories_owner_idx').on(table.ownerId), index('categories_sector_idx').on(table.sector)],
);

export const clientLeads = sqliteTable(
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
    rating: real('rating'),
    reviews: integer('reviews').notNull().default(0),
    mapsUrl: text('maps_url').notNull(),
    sector: text('sector').notNull(),
    subCategory: text('sub_category').notNull(),
    pitch: text('pitch').notNull(),
    status: text('status').$type<LeadStatus>().notNull().default('New'),
    /** Waktu status pipeline terakhir berubah — dasar sortir follow-up. */
    statusUpdatedAt: integer('status_updated_at', { mode: 'timestamp_ms' }).notNull(),
    /** Staf yang meng-claim lead (kunci kolisi antar sales). */
    assignedToId: text('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
    assignedToName: text('assigned_to_name'),
    claimedAt: integer('claimed_at', { mode: 'timestamp_ms' }),
    source: text('source').$type<'SEARCH' | 'MANUAL'>().notNull().default('SEARCH'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('client_leads_owner_place_unique').on(table.ownerId, table.placeId),
    index('client_leads_owner_idx').on(table.ownerId),
    index('client_leads_status_idx').on(table.status),
  ],
);

export const apiUsageLogs = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('api_usage_logs_created_idx').on(table.createdAt),
    index('api_usage_logs_user_idx').on(table.userId),
  ],
);

/**
 * Counter agregat per user per periode (YYYY-MM). Diinkremen atomik dengan
 * `INSERT ... ON CONFLICT DO UPDATE hits = hits + 1` di transaksi yang sama
 * dengan penulisan log.
 */
export const apiUsageCounters = sqliteTable(
  'api_usage_counters',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    hits: integer('hits').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.period] })],
);

/**
 * Order pembayaran paket (DOKU Checkout). Satu baris = satu percobaan
 * checkout; `invoice_number` dikirim ke DOKU sebagai `order.invoice_number`
 * dan menjadi kunci rekonsiliasi HTTP Notification.
 */
export const orders = sqliteTable(
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
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    notificationPayload: text('notification_payload'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('orders_invoice_unique').on(table.invoiceNumber),
    index('orders_status_idx').on(table.status),
    index('orders_created_idx').on(table.createdAt),
  ],
);
