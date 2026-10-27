import { randomUUID } from 'node:crypto';
import { getDatabase, normalizeNumber } from './db';
import { currentPeriod, config } from './config';
import { HttpError } from './errors';
import type { Role } from './db/schema';
import type { UsageLogEntry, UsageOverview, UsagePerUser, UsageSnapshot } from './types';

/**
 * Pencatat pemakaian Google Places API.
 *
 * Setiap panggilan HTTP keluar WAJIB melewati `recordApiHit`. Log dan counter
 * ditulis dalam SATU batch transaksi, sehingga hit tidak mungkin tercatat
 * tanpa counter (atau sebaliknya) walau request berjalan paralel.
 */

export type PlacesEndpoint = 'TEXT_SEARCH' | 'PLACE_DETAILS';
export type ApiHitStatus = 'SUCCESS' | 'ERROR';

export type RecordApiHitInput = {
  userId: string;
  endpoint: PlacesEndpoint;
  queryParam: string;
  status: ApiHitStatus;
  httpStatus?: number | null;
  placeId?: string | null;
  durationMs: number;
};

export async function recordApiHit(input: RecordApiHitInput): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  const period = currentPeriod(new Date(now));

  await db.batch([
    {
      sql: `INSERT INTO api_usage_logs
              (id, user_id, endpoint, query_param, status, http_status, place_id, duration_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        randomUUID(),
        input.userId,
        input.endpoint,
        input.queryParam.slice(0, 300),
        input.status,
        input.httpStatus ?? null,
        input.placeId ?? null,
        Math.max(0, Math.round(input.durationMs)),
        now,
      ],
    },
    {
      sql: `INSERT INTO api_usage_counters (user_id, period, hits, updated_at)
            VALUES (?, ?, 1, ?)
            ON CONFLICT (user_id, period) DO UPDATE SET
              hits = api_usage_counters.hits + 1,
              updated_at = excluded.updated_at`,
      params: [input.userId, period, now],
    },
  ]);
}

async function scalar(sql: string, params: Array<string | number> = []): Promise<number> {
  const db = await getDatabase();
  const row = await db.one<{ value: unknown }>(sql, params);
  return normalizeNumber(row?.value);
}

export async function getUsageSnapshot(userId: string, role: Role): Promise<UsageSnapshot> {
  const period = currentPeriod();
  const [userHits, globalHits] = await Promise.all([
    scalar('SELECT hits AS value FROM api_usage_counters WHERE user_id = ? AND period = ?', [userId, period]),
    scalar('SELECT COALESCE(SUM(hits), 0) AS value FROM api_usage_counters WHERE period = ?', [period]),
  ]);

  const limit = role === 'USER' ? config.quota.userMonthlyLimit : config.quota.globalMonthlyLimit;
  return {
    period,
    userHits,
    userLimit: limit,
    globalHits,
    globalLimit: config.quota.globalMonthlyLimit,
  };
}

/** Tolak pencarian bila kuota bulanan user atau platform sudah habis. */
export async function assertQuota(userId: string, role: Role): Promise<void> {
  const snapshot = await getUsageSnapshot(userId, role);
  if (snapshot.globalHits >= snapshot.globalLimit) {
    throw new HttpError(
      429,
      'QUOTA_EXCEEDED',
      `Kuota Google Places API platform bulan ${snapshot.period} sudah habis (${snapshot.globalHits}/${snapshot.globalLimit}).`,
    );
  }
  if (role === 'USER' && snapshot.userHits >= snapshot.userLimit) {
    throw new HttpError(
      429,
      'QUOTA_EXCEEDED',
      `Kuota pencarian Anda bulan ${snapshot.period} sudah habis (${snapshot.userHits}/${snapshot.userLimit} hit).`,
    );
  }
}

export async function getUsageOverview(logLimit = 200): Promise<UsageOverview> {
  const db = await getDatabase();
  const period = currentPeriod();
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const [globalHits, perUserRows, logRows, dailyRows, totalUsers] = await Promise.all([
    scalar('SELECT COALESCE(SUM(hits), 0) AS value FROM api_usage_counters WHERE period = ?', [period]),
    db.all<{ id: string; name: string; email: string; role: string; hits: unknown }>(
      `SELECT u.id, u.name, u.email, u.role, COALESCE(c.hits, 0) AS hits
       FROM users u
       LEFT JOIN api_usage_counters c ON c.user_id = u.id AND c.period = ?
       ORDER BY hits DESC, u.name ASC`,
      [period],
    ),
    db.all<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      endpoint: string;
      query_param: string;
      status: string;
      http_status: unknown;
      place_id: string | null;
      duration_ms: unknown;
      created_at: unknown;
    }>(
      `SELECT l.id, l.user_id, u.name, u.email, l.endpoint, l.query_param, l.status,
              l.http_status, l.place_id, l.duration_ms, l.created_at
       FROM api_usage_logs l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [logLimit],
    ),
    db.all<{ created_at: unknown }>('SELECT created_at FROM api_usage_logs WHERE created_at >= ?', [
      since,
    ]),
    scalar('SELECT COUNT(*) AS value FROM users'),
  ]);

  const perUser: UsagePerUser[] = perUserRows.map((row) => ({
    userId: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as Role,
    hits: normalizeNumber(row.hits),
  }));

  // Agregasi harian dilakukan di JS agar SQL tetap portabel SQLite/Postgres.
  const dailyMap = new Map<string, number>();
  for (const row of dailyRows) {
    const date = new Date(normalizeNumber(row.created_at)).toISOString().slice(0, 10);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
  }
  const daily = [...dailyMap.entries()]
    .map(([date, hits]) => ({ date, hits }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const logs: UsageLogEntry[] = logRows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.name),
    userEmail: String(row.email),
    endpoint: String(row.endpoint) === 'PLACE_DETAILS' ? 'PLACE_DETAILS' : 'TEXT_SEARCH',
    queryParam: String(row.query_param),
    status: String(row.status) === 'SUCCESS' ? 'SUCCESS' : 'ERROR',
    httpStatus: row.http_status === null ? null : normalizeNumber(row.http_status),
    placeId: row.place_id === null ? null : String(row.place_id),
    durationMs: normalizeNumber(row.duration_ms),
    createdAt: new Date(normalizeNumber(row.created_at)).toISOString(),
  }));

  return {
    period,
    globalHits,
    globalLimit: config.quota.globalMonthlyLimit,
    perUser,
    daily,
    logs,
    totalUsers,
  };
}
