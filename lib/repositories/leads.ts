import { randomUUID } from 'node:crypto';
import { getDatabase, normalizeNumber } from '@/lib/db';
import type { SqlParam } from '@/lib/db';
import type { LeadStatus } from '@/lib/db/schema';
import { badRequest, forbidden, notFound } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';
import { isAdmin, type SessionUser } from '@/lib/auth';
import type { Lead, Prospect } from '@/lib/types';
import type { LeadCreateInput, LeadUpdateInput } from '@/lib/validation';
import { userExists } from './users';

type LeadRow = {
  id: string;
  owner_id: string;
  owner_name?: string | null;
  place_id: string;
  name: string;
  address: string;
  city: string;
  phone_raw: string | null;
  phone_display: string | null;
  whatsapp: string | null;
  website: string | null;
  rating: unknown;
  reviews: unknown;
  maps_url: string;
  sector: string;
  sub_category: string;
  pitch: string;
  status: string;
  source: string;
  created_at: unknown;
  updated_at: unknown;
};

function serialize(row: LeadRow): Lead {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    ownerName: row.owner_name ?? undefined,
    placeId: String(row.place_id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    phoneRaw: row.phone_raw === null ? null : String(row.phone_raw),
    phoneDisplay: row.phone_display === null ? null : String(row.phone_display),
    whatsapp: row.whatsapp === null ? null : String(row.whatsapp),
    website: row.website === null ? null : String(row.website),
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviews: normalizeNumber(row.reviews),
    mapsUrl: String(row.maps_url),
    sector: String(row.sector),
    subCategory: String(row.sub_category),
    pitch: String(row.pitch),
    status: String(row.status) as LeadStatus,
    source: String(row.source) === 'MANUAL' ? 'MANUAL' : 'SEARCH',
  };
}

async function findLeadRow(id: string): Promise<LeadRow | null> {
  const db = await getDatabase();
  return db.one<LeadRow>(
    `SELECT l.*, u.name AS owner_name
     FROM client_leads l
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.id = ?`,
    [id],
  );
}

/* ───────────────────────── hasil pencarian ───────────────────────── */

/**
 * Upsert hasil pencarian per (owner, placeId). Status pipeline yang sudah ada
 * TIDAK ditimpa — hanya data bisnis yang diperbarui.
 */
export async function saveSearchLeads(
  ownerId: string,
  city: string,
  prospects: Prospect[],
): Promise<Lead[]> {
  if (prospects.length === 0) return [];
  const db = await getDatabase();
  const now = Date.now();

  await db.batch(
    prospects.map((lead) => ({
      sql: `INSERT INTO client_leads
              (id, owner_id, place_id, name, address, city, phone_raw, phone_display, whatsapp, website,
               rating, reviews, maps_url, sector, sub_category, pitch, status, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', 'SEARCH', ?, ?)
            ON CONFLICT (owner_id, place_id) DO UPDATE SET
              name = excluded.name,
              address = excluded.address,
              city = excluded.city,
              phone_raw = excluded.phone_raw,
              phone_display = excluded.phone_display,
              whatsapp = excluded.whatsapp,
              website = excluded.website,
              rating = excluded.rating,
              reviews = excluded.reviews,
              maps_url = excluded.maps_url,
              sector = excluded.sector,
              sub_category = excluded.sub_category,
              pitch = excluded.pitch,
              updated_at = excluded.updated_at`,
      params: [
        randomUUID(),
        ownerId,
        lead.placeId,
        lead.name,
        lead.address,
        lead.city?.trim() || city,
        lead.phoneRaw,
        lead.phoneDisplay,
        lead.whatsapp,
        lead.website,
        lead.rating,
        lead.reviews,
        lead.mapsUrl,
        lead.sector,
        lead.subCategory,
        lead.pitch,
        now,
        now,
      ],
    })),
  );

  const placeholders = prospects.map(() => '?').join(', ');
  const rows = await db.all<LeadRow>(
    `SELECT l.*, u.name AS owner_name
     FROM client_leads l
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.owner_id = ? AND l.place_id IN (${placeholders})`,
    [ownerId, ...prospects.map((lead) => lead.placeId)],
  );

  const byPlaceId = new Map(rows.map((row) => [String(row.place_id), serialize(row)]));
  return prospects
    .map((prospect) => byPlaceId.get(prospect.placeId))
    .filter((lead): lead is Lead => Boolean(lead));
}

/* ───────────────────────── query & CRUD ───────────────────────── */

export type LeadQuery = {
  status?: LeadStatus;
  q?: string;
  ownerId?: string;
  sector?: string;
  subCategory?: string;
  limit?: number;
};

type LeadFilter = { where: string; params: SqlParam[] };

/** Bangun klausa WHERE yang dipakai bersama oleh listLeads, facet, dan hapus massal. */
function buildLeadFilter(user: SessionUser, query: LeadQuery = {}): LeadFilter {
  const clauses: string[] = [];
  const params: SqlParam[] = [];

  if (!isAdmin(user.role)) {
    clauses.push('l.owner_id = ?');
    params.push(user.id);
  } else if (query.ownerId && user.role === 'SUPERADMIN') {
    clauses.push('l.owner_id = ?');
    params.push(query.ownerId);
  }
  if (query.status) {
    clauses.push('l.status = ?');
    params.push(query.status);
  }
  if (query.sector?.trim()) {
    clauses.push('l.sector = ?');
    params.push(query.sector.trim());
  }
  if (query.subCategory?.trim()) {
    clauses.push('l.sub_category = ?');
    params.push(query.subCategory.trim());
  }
  if (query.q?.trim()) {
    const term = `%${query.q.trim().toLowerCase()}%`;
    clauses.push('(lower(l.name) LIKE ? OR lower(l.city) LIKE ? OR l.whatsapp LIKE ?)');
    params.push(term, term, `%${query.q.trim()}%`);
  }

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export async function listLeads(user: SessionUser, query: LeadQuery = {}): Promise<Lead[]> {
  const db = await getDatabase();
  const { where, params } = buildLeadFilter(user, query);
  const limit = Math.min(Math.max(query.limit ?? 300, 1), 1000);
  const args = [...params, limit];

  const rows = await db.all<LeadRow>(
    `SELECT l.*, u.name AS owner_name
     FROM client_leads l
     LEFT JOIN users u ON u.id = l.owner_id
     ${where}
     ORDER BY l.updated_at DESC
     LIMIT ?`,
    args,
  );
  return rows.map(serialize);
}

export type LeadCategoryFacet = { sector: string; subCategory: string; total: number };

/** Daftar kombinasi sektor + sub-kategori yang tersimpan, dipakai untuk filter kategori di UI. */
export async function listLeadCategories(user: SessionUser): Promise<LeadCategoryFacet[]> {
  const db = await getDatabase();
  const rows = await db.all<{ sector: string | null; sub_category: string | null; total: unknown }>(
    `SELECT l.sector AS sector, l.sub_category AS sub_category, COUNT(*) AS total
     FROM client_leads l
     ${isAdmin(user.role) ? '' : 'WHERE l.owner_id = ?'}
     GROUP BY l.sector, l.sub_category
     ORDER BY l.sector ASC, l.sub_category ASC`,
    isAdmin(user.role) ? [] : [user.id],
  );

  return rows.map((row) => ({
    sector: row.sector?.trim() || 'Tanpa sektor',
    subCategory: row.sub_category?.trim() || 'Tanpa sub-kategori',
    total: normalizeNumber(row.total),
  }));
}

/**
 * Hapus massal berdasarkan filter aktif. Wajib ada minimal satu filter agar
 * tidak menghapus seluruh database karena klik tombol tanpa memilih apa pun.
 */
export async function deleteLeadsByFilter(
  actor: SessionUser,
  query: LeadQuery = {},
): Promise<number> {
  if (!isAdmin(actor.role)) throw forbidden('Hanya Admin yang dapat menghapus lead.');
  const hasFilter = Boolean(query.status || query.sector?.trim() || query.subCategory?.trim() || query.q?.trim());
  if (!hasFilter) throw badRequest('Pilih minimal satu filter sebelum menghapus.');

  const db = await getDatabase();
  const { where, params } = buildLeadFilter(actor, {
    status: query.status,
    sector: query.sector,
    subCategory: query.subCategory,
    q: query.q,
    ownerId: query.ownerId,
  });
  if (!where) throw badRequest('Filter tidak valid.');

  const counted = await db.all<{ total: unknown }>(
    `SELECT COUNT(*) AS total FROM client_leads l ${where}`,
    params,
  );
  const total = normalizeNumber(counted[0]?.total);
  if (total === 0) return 0;

  await db.run(
    `DELETE FROM client_leads WHERE id IN (SELECT l.id FROM client_leads l ${where})`,
    params,
  );
  return total;
}

export async function getLead(user: SessionUser, id: string): Promise<Lead> {
  const row = await findLeadRow(id);
  if (!row) throw notFound('Lead tidak ditemukan.');
  if (!isAdmin(user.role) && row.owner_id !== user.id) throw forbidden('Lead ini bukan milik akun Anda.');
  return serialize(row);
}

export async function updateLeadStatus(user: SessionUser, id: string, status: LeadStatus): Promise<Lead> {
  const db = await getDatabase();
  const row = await findLeadRow(id);
  if (!row) throw notFound('Lead tidak ditemukan.');
  if (!isAdmin(user.role) && row.owner_id !== user.id) throw forbidden('Lead ini bukan milik akun Anda.');

  await db.run('UPDATE client_leads SET status = ?, updated_at = ? WHERE id = ?', [status, Date.now(), id]);
  const updated = await findLeadRow(id);
  if (!updated) throw notFound('Lead tidak ditemukan.');
  return serialize(updated);
}

export async function updateLeadDetails(user: SessionUser, id: string, input: LeadUpdateInput): Promise<Lead> {
  if (!isAdmin(user.role)) throw forbidden('Hanya Admin yang dapat mengubah profil lead.');
  const db = await getDatabase();
  if (!(await findLeadRow(id))) throw notFound('Lead tidak ditemukan.');

  const phone = input.phone === undefined ? null : normalizePhone(input.phone);
  if (input.phone !== undefined && input.phone.trim() !== '' && !phone) {
    throw badRequest('Nomor telepon tidak valid. Gunakan format Indonesia (08xx / +62xx).');
  }

  const fields: string[] = [];
  const params: SqlParam[] = [];
  const push = (column: string, value: SqlParam) => {
    fields.push(`${column} = ?`);
    params.push(value);
  };

  if (input.name !== undefined) push('name', input.name);
  if (input.city !== undefined) push('city', input.city);
  if (input.address !== undefined) push('address', input.address);
  if (input.sector !== undefined) push('sector', input.sector);
  if (input.subCategory !== undefined) push('sub_category', input.subCategory);
  if (input.pitch !== undefined) push('pitch', input.pitch);
  if (input.website !== undefined) push('website', input.website || null);
  if (input.mapsUrl !== undefined) push('maps_url', input.mapsUrl);
  if (input.status !== undefined) push('status', input.status);
  if (input.phone !== undefined) {
    push('phone_raw', phone?.raw ?? null);
    push('phone_display', phone?.display ?? null);
    push('whatsapp', phone?.wa ?? null);
  }
  push('updated_at', Date.now());
  params.push(id);

  await db.run(`UPDATE client_leads SET ${fields.join(', ')} WHERE id = ?`, params);
  const updated = await findLeadRow(id);
  if (!updated) throw notFound('Lead tidak ditemukan.');
  return serialize(updated);
}

export async function createManualLead(actor: SessionUser, input: LeadCreateInput): Promise<Lead> {
  if (!isAdmin(actor.role)) throw forbidden('Hanya Admin yang dapat menambah lead manual.');
  const db = await getDatabase();

  let ownerId = actor.id;
  if (actor.role === 'SUPERADMIN' && input.ownerId) {
    if (!(await userExists(input.ownerId))) throw badRequest('User pemilik lead tidak ditemukan.');
    ownerId = input.ownerId;
  }

  const phone = normalizePhone(input.phone || null);
  if (input.phone.trim() !== '' && !phone) {
    throw badRequest('Nomor telepon tidak valid. Gunakan format Indonesia (08xx / +62xx).');
  }

  const now = Date.now();
  const id = randomUUID();
  await db.run(
    `INSERT INTO client_leads
       (id, owner_id, place_id, name, address, city, phone_raw, phone_display, whatsapp, website,
        rating, reviews, maps_url, sector, sub_category, pitch, status, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)`,
    [
      id,
      ownerId,
      `manual-${id}`,
      input.name,
      input.address || '-',
      input.city,
      phone?.raw ?? null,
      phone?.display ?? null,
      phone?.wa ?? null,
      input.website || null,
      input.mapsUrl || '',
      input.sector || 'Manual',
      input.subCategory || 'Input manual',
      input.pitch,
      input.status,
      now,
      now,
    ],
  );

  const created = await findLeadRow(id);
  if (!created) throw notFound('Lead gagal dibuat.');
  return serialize(created);
}

export async function deleteLead(actor: SessionUser, id: string): Promise<void> {
  if (!isAdmin(actor.role)) throw forbidden('Hanya Admin yang dapat menghapus lead.');
  const db = await getDatabase();
  if (!(await findLeadRow(id))) throw notFound('Lead tidak ditemukan.');
  await db.run('DELETE FROM client_leads WHERE id = ?', [id]);
}

export async function countLeadsByStatus(
  user: SessionUser,
): Promise<Record<LeadStatus | 'all', number>> {
  const db = await getDatabase();
  const rows = await db.all<{ status: string; value: unknown }>(
    `SELECT status, COUNT(*) AS value
     FROM client_leads
     ${isAdmin(user.role) ? '' : 'WHERE owner_id = ?'}
     GROUP BY status`,
    isAdmin(user.role) ? [] : [user.id],
  );

  const counts: Record<LeadStatus | 'all', number> = { all: 0, New: 0, Contacted: 0, Interested: 0, Closed: 0 };
  for (const row of rows) {
    const status = String(row.status) as LeadStatus;
    const value = normalizeNumber(row.value);
    if (status in counts) counts[status] = value;
    counts.all += value;
  }
  return counts;
}

/** Ambil lead berdasarkan id dengan scope role (dipakai export CSV). */
export async function getLeadsByIds(user: SessionUser, ids: string[]): Promise<Lead[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const scope = isAdmin(user.role) ? '' : 'AND l.owner_id = ?';
  const params: SqlParam[] = [...ids, ...(isAdmin(user.role) ? [] : [user.id])];

  const rows = await db.all<LeadRow>(
    `SELECT l.*, u.name AS owner_name
     FROM client_leads l
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.id IN (${placeholders}) ${scope}
     LIMIT 1000`,
    params,
  );
  return rows.map(serialize);
}
