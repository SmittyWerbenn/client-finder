'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Lead, LeadStatus, SearchMeta, SearchResponse, UsageSnapshot } from '@/lib/types';
import type { SessionUser } from '@/lib/auth';
import { PROVINCES, citiesForProvince, provinceOfCity } from '@/lib/locations';
import { DEFAULT_FILTERS, WEBSITE_FILTER_OPTIONS, websiteFilterLabel, matchesFilters, type ProspectFilters, type WaTemplate } from '@/lib/outreach';
import { apiFetch } from '@/lib/client-api';
import { downloadBase64File } from '@/lib/download';
import ProspectTable from './ProspectTable';

type Tab = 'category' | 'name';

type Toast = { message: string; error?: boolean };

export default function SearchWorkspace({
  user,
  initialCategories,
  initialLeads,
  initialUsage,
  templates,
  denied,
  demo = false,
}: {
  user: SessionUser;
  initialCategories: Category[];
  initialLeads: Lead[];
  initialUsage: UsageSnapshot;
  templates: WaTemplate[];
  denied?: boolean;
  demo?: boolean;
}) {
  const [categories] = useState(initialCategories);
  const [tab, setTab] = useState<Tab>('category');
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id ?? '');
  // Mode demo langsung siap pakai: kota awal mengikuti dataset mock supaya
  // tombol "Cari Prospek" tidak memblokir pengunjung dengan error validasi.
  const demoSeed = demo ? initialLeads.find((lead) => lead.city && provinceOfCity(lead.city)) : undefined;
  const demoCity = demoSeed?.city ?? '';
  const [province, setProvince] = useState(demoCity ? provinceOfCity(demoCity) ?? '' : '');
  const [city, setCity] = useState(demoCity);
  const [nameQuery, setNameQuery] = useState('');
  const [filters, setFilters] = useState<ProspectFilters>(DEFAULT_FILTERS);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot>(initialUsage);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(denied ? 'Role akun Anda tidak punya akses ke menu tersebut.' : null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string, isError = false) => setToast({ message, error: isError }), []);

  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? null;
  const cityOptions = useMemo(() => citiesForProvince(province), [province]);
  const queryPreview =
    tab === 'category'
      ? `"${category?.keyword ?? 'usaha lokal'} di ${city || '{Kota / Kabupaten}'}"`
      : `"${nameQuery.trim() || 'nama usaha'} di ${city || '{Kota / Kabupaten}'}"`;

  const filteredLeads = useMemo(() => {
    const searched = leads.filter((lead) => matchesFilters(lead, filters));
    return statusFilter === 'all' ? searched : searched.filter((lead) => lead.status === statusFilter);
  }, [leads, filters, statusFilter]);

  const counts = useMemo(() => {
    const base: Record<LeadStatus | 'all', number> = { all: 0, New: 0, Contacted: 0, Interested: 0, Closed: 0 };
    const searched = leads.filter((lead) => matchesFilters(lead, filters));
    for (const lead of searched) {
      base[lead.status] += 1;
      base.all += 1;
    }
    return base;
  }, [leads, filters]);

  const withPhone = filteredLeads.filter((lead) => Boolean(lead.whatsapp)).length;
  const withWebsite = leads.filter((lead) => Boolean(lead.website)).length;
  const withoutWebsite = leads.length - withWebsite;
  const skippedByFilter =
    filters.websiteFilter === 'has_website'
      ? meta?.skippedWithoutWebsite ?? 0
      : filters.websiteFilter === 'no_website'
        ? meta?.skippedWithWebsite ?? 0
        : (meta?.skippedWithWebsite ?? 0) + (meta?.skippedWithoutWebsite ?? 0);
  const skippedLabel =
    filters.websiteFilter === 'has_website'
      ? 'Dibuang (tanpa website)'
      : filters.websiteFilter === 'no_website'
        ? 'Dibuang (punya website)'
        : 'Disaring filter website';

  async function runSearch() {
    if (loading) return;
    if (!category && tab === 'category') {
      setError('Belum ada kategori untuk akun Anda. Minta Superadmin menugaskan kategori terlebih dahulu.');
      return;
    }
    if (tab === 'name' && nameQuery.trim().length < 2) {
      setError('Isi nama usaha atau brand dulu (minimal 2 karakter).');
      return;
    }
    if (!province) {
      setError('Pilih provinsi dulu sebelum mencari.');
      return;
    }
    if (!city) {
      setError('Pilih kota / kabupaten dulu sebelum mencari.');
      return;
    }
    setLoading(true);
    setError(null);
    setStatusFilter('all');
    try {
      const payload = await apiFetch<SearchResponse>('/api/search', {
        method: 'POST',
        body: JSON.stringify({
          mode: tab,
          categoryId: tab === 'category' ? categoryId : undefined,
          name: tab === 'name' ? nameQuery.trim() : undefined,
          city,
          websiteFilter: filters.websiteFilter,
        }),
      });
      setLeads(payload.leads);
      setMeta(payload.meta);
      setUsage(payload.usage);
      notify(`${payload.leads.length} prospek ditemukan · ${websiteFilterLabel(filters.websiteFilter)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pencarian gagal.');
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: LeadStatus, silent = false) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!silent) notify(`Status diperbarui menjadi ${status}.`);
    } catch (err) {
      setLeads(previous);
      notify(err instanceof Error ? err.message : 'Gagal memperbarui status.', true);
    }
  }

  async function claimOrRelease(id: string, action: 'claim' | 'release') {
    try {
      const payload = await apiFetch<{ lead: Lead }>(`/api/leads/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
      });
      setLeads((current) => current.map((lead) => (lead.id === id ? payload.lead : lead)));
      notify(action === 'claim' ? 'Lead dikunci untuk Anda.' : 'Kunci lead dilepas.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui kepemilikan lead.', true);
    }
  }

  async function exportCsv() {
    if (filteredLeads.length === 0) return;
    try {
      const payload = await apiFetch<{ fileBase64: string; fileName: string; mime: string }>('/api/export', {
        method: 'POST',
        body: JSON.stringify({ ids: filteredLeads.map((lead) => lead.id), city }),
      });
      if (!payload.fileBase64) {
        notify('Tidak ada data untuk diexport.', true);
        return;
      }
      downloadBase64File(payload.fileBase64, payload.fileName || 'prospek.xlsx', payload.mime);
      notify(`${filteredLeads.length} prospek diexport ke Excel.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export Excel gagal.', true);
    }
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>
            Pencarian Prospek {demo ? <span className="demo-chip">Mode Demo</span> : null}
          </h1>
          <p className="page-sub">
            Cari dan saring calon mitra kerja sama, klien penawaran jasa, atau jaringan supplier lokal di wilayah
            target Anda.
          </p>
          <p className="page-meta">
            {demo ? (
              <>
                Data contoh lokal · filter website fleksibel · kuota demo {usage.userHits}/{usage.userLimit} hit
              </>
            ) : (
              <>
                Masuk sebagai <b>{user.name}</b> · filter website fleksibel · kuota {usage.userHits}/
                {usage.userLimit} hit bulan {usage.period}
              </>
            )}
          </p>
        </div>
      </div>

      <section className="card search-card">
        <div className="search-mode-head">
          <span className="search-mode-label">Mode pencarian</span>
          <div className="search-tabs" role="group" aria-label="Mode pencarian prospek">
            <button
              type="button"
              className={`search-tab ${tab === 'category' ? 'active' : ''}`}
              aria-pressed={tab === 'category'}
              onClick={() => setTab('category')}
            >
              <span className="tab-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                </svg>
              </span>
              <span className="tab-text">
                <strong>Kategori Usaha</strong>
                <small>Telusuri per jenis bisnis</small>
              </span>
            </button>
            <button
              type="button"
              className={`search-tab ${tab === 'name' ? 'active' : ''}`}
              aria-pressed={tab === 'name'}
              onClick={() => setTab('name')}
            >
              <span className="tab-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V20" />
                  <path d="M4 20h16M9.5 20v-5.5h5V20" />
                  <path d="M9 9h6" />
                </svg>
              </span>
              <span className="tab-text">
                <strong>Nama Usaha / Brand</strong>
                <small>Sudah tahu nama targetnya</small>
              </span>
            </button>
          </div>
          <p className="search-mode-help">
            {tab === 'category'
              ? 'Cari semua usaha pada satu kategori di kota terpilih — cocok untuk prospecting massal.'
              : 'Cari usaha berdasarkan nama atau brand tertentu — cocok kalau targetnya sudah spesifik.'}
          </p>
        </div>

        <div className="search-body">
          <div className="search-grid">
            {tab === 'category' ? (
              <label className="field search-field">
                <span className="field-label">Kategori prospek</span>
                <select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  {categories.length === 0 ? <option value="">Belum ada kategori</option> : null}
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sector} — {item.subCategory}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field search-field">
                <span className="field-label">Nama usaha / brand</span>
                <input
                  className="input"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void runSearch();
                  }}
                  placeholder="mis. Kopi Kenangan"
                  maxLength={80}
                />
              </label>
            )}

            <label className="field search-field">
              <span className="field-label">Provinsi</span>
              <select
                className="select"
                value={province}
                onChange={(event) => {
                  setProvince(event.target.value);
                  setCity('');
                }}
              >
                <option value="">Pilih provinsi…</option>
                {PROVINCES.map((group) => (
                  <option key={group.province} value={group.province}>
                    {group.province}
                  </option>
                ))}
              </select>
            </label>

            <label className="field search-field">
              <span className="field-label">Kota / Kabupaten</span>
              <select
                className="select"
                value={city}
                disabled={!province}
                onChange={(event) => setCity(event.target.value)}
              >
                <option value="">
                  {province ? 'Pilih kota / kabupaten…' : 'Pilih Provinsi terlebih dahulu'}
                </option>
                {cityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="website-filter">
            <label className="field search-field">
              <span className="field-label">Status website target</span>
              <select
                className="select"
                value={filters.websiteFilter}
                onChange={(event) =>
                  setFilters({ ...filters, websiteFilter: event.target.value as ProspectFilters['websiteFilter'] })
                }
              >
                {WEBSITE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="search-hint website-filter-hint">
              Pilih “Khusus tanpa website” jika target penawaran Anda berfokus pada pembuatan website baru. Biarkan
              “Semua bisnis” untuk partnership, suplai, atau penawaran jasa lain.
            </p>
          </div>

          <p className="search-hint">
            {tab === 'category'
              ? 'Pilih kategori, lalu provinsi dan kota. Sistem memindai semua usaha di kategori ini pada kota terpilih.'
              : 'Tulis nama atau brand, lalu pilih provinsi dan kota. Minimal 2 karakter.'}
          </p>

          <div className="filter-row">
            <label className="mini-field">
              <input
                type="checkbox"
                checked={filters.phoneOnly}
                onChange={(event) => setFilters({ ...filters, phoneOnly: event.target.checked })}
              />
              Hanya yang ada nomor WhatsApp
            </label>
            <label className="mini-field">
              Rating minimal
              <select
                className="select select-sm"
                value={filters.minRating}
                onChange={(event) => setFilters({ ...filters, minRating: Number(event.target.value) })}
              >
                <option value={0}>Semua</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>
            <label className="mini-field">
              Ulasan minimal
              <select
                className="select select-sm"
                value={filters.minReviews}
                onChange={(event) => setFilters({ ...filters, minReviews: Number(event.target.value) })}
              >
                <option value={0}>Semua</option>
                <option value={10}>10+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
              </select>
            </label>
          </div>

          <div className="search-foot">
            <span className="query-preview">
              <span className={`query-mode-chip ${tab === 'category' ? 'is-category' : 'is-name'}`}>
                {tab === 'category' ? 'Mode kategori' : 'Mode nama'}
              </span>
              Query: <code>{queryPreview}</code>
              <span className="search-mode-note">Google Places Text Search</span>
            </span>
            <button type="button" className="btn btn-primary search-btn" onClick={() => void runSearch()} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Mencari…' : 'Cari Prospek'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Tempat dipindai</span>
          <strong>{meta?.scanned ?? leads.length}</strong>
          <small>{meta ? `${meta.pagesScanned} halaman` : 'menampilkan lead tersimpan'}</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">{skippedLabel}</span>
          <strong>{skippedByFilter}</strong>
          <small>{filters.websiteFilter === 'all' ? 'semua status diloloskan' : 'sesuai filter terpilih'}</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lolos filter</span>
          <strong>{leads.length}</strong>
          <small>
            {withoutWebsite} tanpa web · {withWebsite} sudah online · {withPhone} punya WhatsApp
          </small>
        </div>
        <div className="stat-card accent">
          <span className="stat-label">Hit API bulan ini</span>
          <strong>{usage.userHits}</strong>
          <small>
            dari {usage.userLimit} · platform {usage.globalHits}/{usage.globalLimit}
          </small>
        </div>
      </div>

      <ProspectTable
        rows={filteredLeads}
        totalCount={leads.length}
        city={city}
        templates={templates}
        counts={counts}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onStatusChange={changeStatus}
        onClaim={(id, action) => void claimOrRelease(id, action)}
        user={user}
        demo={demo}
        onExport={() => void exportCsv()}
        notify={notify}
        loading={loading}
        note={`Status website: ${websiteFilterLabel(filters.websiteFilter)} · data tersimpan di database`}
      />

      <div className="toast-wrap">
        {toast ? <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.message}</div> : null}
      </div>
    </div>
  );
}
