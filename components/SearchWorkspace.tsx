'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Lead, LeadStatus, SearchMeta, SearchResponse, UsageSnapshot } from '@/lib/types';
import type { SessionUser } from '@/lib/auth';
import { DEFAULT_CITY, DEFAULT_PROVINCE, JAVA_PROVINCES, citiesForProvince, defaultCityFor } from '@/lib/locations';
import { matchesFilters, type ProspectFilters, type WaTemplate } from '@/lib/outreach';
import { apiFetch } from '@/lib/client-api';
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
}: {
  user: SessionUser;
  initialCategories: Category[];
  initialLeads: Lead[];
  initialUsage: UsageSnapshot;
  templates: WaTemplate[];
  denied?: boolean;
}) {
  const [categories] = useState(initialCategories);
  const [tab, setTab] = useState<Tab>('category');
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id ?? '');
  const [province, setProvince] = useState(DEFAULT_PROVINCE);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [nameQuery, setNameQuery] = useState('');
  const [filters, setFilters] = useState<ProspectFilters>({ phoneOnly: false, minRating: 0, minReviews: 0 });
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
  const queryPreview =
    tab === 'category'
      ? `"${category?.keyword ?? 'usaha lokal'} di ${city}"`
      : `"${nameQuery.trim() || 'nama usaha'} di ${city}"`;

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

  async function runSearch() {
    if (loading) return;
    if (!category && tab === 'category') {
      setError('Belum ada kategori untuk akun Anda. Minta Superadmin menugaskan kategori terlebih dahulu.');
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
        }),
      });
      setLeads(payload.leads);
      setMeta(payload.meta);
      setUsage(payload.usage);
      notify(`${payload.leads.length} prospek tanpa website ditemukan.`);
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

  async function exportCsv() {
    if (filteredLeads.length === 0) return;
    try {
      const payload = await apiFetch<{ csv: string; fileName: string }>('/api/export', {
        method: 'POST',
        body: JSON.stringify({ ids: filteredLeads.map((lead) => lead.id), city }),
      });
      if (!payload.csv) {
        notify('Tidak ada data untuk diexport.', true);
        return;
      }
      const blob = new Blob([payload.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.fileName || 'prospek.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(`${filteredLeads.length} prospek diexport ke CSV.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export CSV gagal.', true);
    }
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>Pencarian Prospek</h1>
          <p>
            Masuk sebagai <b>{user.name}</b> · filter “tanpa website” selalu aktif · kuota {usage.userHits}/
            {usage.userLimit} hit bulan {usage.period}
          </p>
        </div>
      </div>

      <section className="card search-card">
        <div className="search-tabs">
          <button
            type="button"
            className={`search-tab ${tab === 'category' ? 'active' : ''}`}
            onClick={() => setTab('category')}
          >
            Kategori Usaha
          </button>
          <button
            type="button"
            className={`search-tab ${tab === 'name' ? 'active' : ''}`}
            onClick={() => setTab('name')}
          >
            Nama Usaha / Brand
          </button>
        </div>

        <div className="search-body">
          <div className="search-grid">
            <label className="field">
              <span>Provinsi</span>
              <select
                className="select"
                value={province}
                onChange={(event) => {
                  const nextProvince = event.target.value;
                  setProvince(nextProvince);
                  setCity(defaultCityFor(nextProvince));
                }}
              >
                {JAVA_PROVINCES.map((group) => (
                  <option key={group.province} value={group.province}>
                    {group.province}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Kota / Kabupaten</span>
              <select className="select" value={city} onChange={(event) => setCity(event.target.value)}>
                {citiesForProvince(province).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {tab === 'category' ? (
              <label className="field search-field">
                <span>Kategori prospek</span>
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
                <span>Nama usaha / brand</span>
                <input
                  className="input"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="mis. Kopi Kenangan"
                  maxLength={80}
                />
              </label>
            )}
          </div>

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
          <span className="stat-label">Dibuang (punya website)</span>
          <strong>{meta?.skippedWithWebsite ?? 0}</strong>
          <small>filter wajib aktif</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lolos filter</span>
          <strong>{leads.length}</strong>
          <small>{withPhone} punya nomor WhatsApp</small>
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
        onExport={() => void exportCsv()}
        notify={notify}
        loading={loading}
        note="Tanpa website · data tersimpan di database"
      />

      <div className="toast-wrap">
        {toast ? <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.message}</div> : null}
      </div>
    </div>
  );
}
