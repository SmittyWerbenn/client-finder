'use client';

import type { ApiEnvelope } from './client-api';
import { DEMO_COOKIE } from './demo-cookie';
import {
  DEMO_CATEGORIES,
  DEMO_LEADS,
  DEMO_OVERVIEW,
  DEMO_USERS,
  DEMO_USAGE,
  demoLeadCounts,
  demoLeadFacets,
} from './demo-data';
import type { Lead, SearchMeta, SearchResponse } from './types';
import { buildLeadsXlsx, bytesToBase64 } from './xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Mock API mode demo.
 *
 * Saat cookie demo aktif, seluruh request `apiFetch` dilayani dari modul ini:
 * tidak ada fetch ke Google Places, tidak ada query database. Aksi tulis
 * ditolak dengan pesan "read-only" supaya pengunjung paham batas demo.
 */

export type DemoResponse = { status: number; payload: ApiEnvelope<unknown> };

const READ_ONLY_MESSAGE = 'Mode demo hanya-baca. Login ke console untuk mengubah data.';

function demoOk<T>(data: T, status = 200): DemoResponse {
  return { status, payload: { ok: true, data } };
}

function demoFail(status: number, code: string, message: string): DemoResponse {
  return { status, payload: { ok: false, error: { code, message } } };
}

export function isDemoModeClient(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim() === `${DEMO_COOKIE}=1`);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

let demoSearches = 0;

function demoSearch(body: Record<string, unknown>): SearchResponse {
  demoSearches += 1;

  const city = String(body.city ?? '').trim() || 'Kota Bandung';
  const mode = body.mode === 'name' ? 'name' : 'category';
  const categoryId = String(body.categoryId ?? '');
  const nameQuery = String(body.name ?? '').trim();
  const websiteFilter =
    body.websiteFilter === 'no_website' || body.websiteFilter === 'has_website'
      ? body.websiteFilter
      : 'all';

  const basePool =
    mode === 'name'
      ? DEMO_LEADS.filter((lead) => lead.name.toLowerCase().includes(nameQuery.toLowerCase()))
      : DEMO_LEADS.filter((lead) => lead.categoryId === categoryId);

  const pool = basePool.filter((lead) => {
    if (websiteFilter === 'no_website') return !lead.website;
    if (websiteFilter === 'has_website') return Boolean(lead.website);
    return true;
  });

  const leads: Lead[] = pool.map((lead) => ({
    ...lead,
    id: `${lead.id}-${slug(city)}`,
    city,
    address: `${lead.address.split(',')[0].trim()}, ${city}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name} ${city}`)}`,
  }));

  const category = DEMO_CATEGORIES.find((item) => item.id === categoryId) ?? DEMO_CATEGORIES[0];
  const keyword = mode === 'name' ? nameQuery : category.keyword;

  const meta: SearchMeta = {
    sector: mode === 'name' ? 'Pencarian Nama Usaha' : category.sector,
    subCategory: mode === 'name' ? nameQuery : category.subCategory,
    keyword,
    pitch: category.pitch,
    city,
    query: `"${keyword} di ${city}"`,
    limit: 20,
    scanned: 46 + basePool.length,
    skippedWithWebsite: websiteFilter === 'no_website' ? basePool.filter((lead) => lead.website).length : 0,
    skippedWithoutWebsite: websiteFilter === 'has_website' ? basePool.filter((lead) => !lead.website).length : 0,
    websiteFilter,
    totalQualified: leads.length,
    pagesScanned: 3,
    capped: false,
    detailsCalls: leads.length,
  };

  return {
    leads,
    meta,
    usage: {
      ...DEMO_USAGE,
      userHits: DEMO_USAGE.userHits + demoSearches * 2,
      globalHits: DEMO_USAGE.globalHits + demoSearches * 2,
    },
  };
}

function demoExport(body: Record<string, unknown>): { fileBase64: string; fileName: string; mime: string } {
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const rows = ids.length
    ? DEMO_LEADS.filter((lead) => ids.some((id) => id.startsWith(lead.id)))
    : DEMO_LEADS;

  if (rows.length === 0) {
    return { fileBase64: '', fileName: '', mime: XLSX_MIME };
  }

  return {
    fileBase64: bytesToBase64(buildLeadsXlsx(rows)),
    fileName: `demo-prospek-${slug(String(body.city ?? rows[0]?.city ?? 'sample'))}.xlsx`,
    mime: XLSX_MIME,
  };
}

export function demoApiRequest(input: string, init?: RequestInit): DemoResponse {
  const path = input.split('?')[0];
  const method = (init?.method ?? 'GET').toUpperCase();
  let body: Record<string, unknown> = {};
  if (typeof init?.body === 'string') {
    try {
      body = JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  if (method === 'GET') {
    if (path === '/api/leads') {
      return demoOk({ leads: DEMO_LEADS, counts: demoLeadCounts(), categories: demoLeadFacets() });
    }
    if (path === '/api/categories') {
      return demoOk({ categories: DEMO_CATEGORIES });
    }
    if (path === '/api/admin/usage') {
      return demoOk({ overview: DEMO_OVERVIEW });
    }
    if (path === '/api/admin/users') {
      return demoOk({ users: DEMO_USERS });
    }
  }

  if (method === 'POST' && path === '/api/search') {
    return demoOk(demoSearch(body));
  }

  if (method === 'POST' && path === '/api/export') {
    return demoOk(demoExport(body));
  }

  if (method === 'POST' && path === '/api/auth/logout') {
    return demoOk({ ok: true });
  }

  if (method === 'GET') {
    return demoFail(404, 'DEMO_ROUTE_NOT_FOUND', 'Endpoint ini tidak tersedia di mode demo.');
  }

  return demoFail(403, 'DEMO_READ_ONLY', READ_ONLY_MESSAGE);
}
