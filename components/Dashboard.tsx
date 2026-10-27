'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Prospect } from '@/lib/types';
import { DEMO } from '@/lib/demo';
import { DEFAULT_CITY, DEFAULT_PROVINCE, JAVA_PROVINCES, citiesForProvince, defaultCityFor } from '@/lib/locations';
import { mockSearch, type MockSearchMeta } from '@/lib/mockSearch';
import {
  DEFAULT_FILTERS,
  LEAD_STATUSES,
  activeAccount,
  applyFilters,
  loadPrototypeState,
  normalizeWaPhone,
  refundCredit,
  savePrototypeState,
  spendCredit,
  upgradeToPro,
  type LeadFilters,
  type LeadStatus,
  type PrototypeState,
  type WaTemplate,
} from '@/lib/prototype';
import { buildProspectCsv, csvFileName } from '@/lib/csv';
import CategoryManager from './CategoryManager';
import ProspectTable from './ProspectTable';
import TemplateModal from './TemplateModal';
import UserMenu from './UserMenu';

type Mode = 'demo' | 'live';
type Meta = MockSearchMeta;

const SEARCH_KEY = 'clientfinder:search:v1';

type SearchSnapshot = {
  leads: Prospect[];
  meta: Meta;
  city: string;
  province: string;
  categoryId: string;
  nameQuery: string;
  tab: 'category' | 'name';
  filters: LeadFilters;
};

export default function Dashboard({
  initialCategories,
  mockMode,
}: {
  initialCategories: Category[];
  mockMode: boolean;
}) {
  const [proto, setProto] = useState<PrototypeState | null>(null);
  const [mode, setMode] = useState<Mode>('demo');
  const [tab, setTab] = useState<'category' | 'name'>('category');
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id ?? '');
  const [province, setProvince] = useState(DEFAULT_PROVINCE);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [nameQuery, setNameQuery] = useState('Kopi Kenangan');
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [leads, setLeads] = useState<Prospect[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    setProto(loadPrototypeState());
  }, []);

  // Pulihkan pencarian terakhir (prospek + status pipeline tetap terlihat setelah reload).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEARCH_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as Partial<SearchSnapshot>;
      if (!Array.isArray(snap.leads) || snap.leads.length === 0 || !snap.meta) return;
      setLeads(snap.leads);
      setMeta(snap.meta as Meta);
      if (snap.city) setCity(snap.city);
      if (snap.province) setProvince(snap.province);
      if (snap.categoryId) setCategoryId(snap.categoryId);
      if (typeof snap.nameQuery === 'string') setNameQuery(snap.nameQuery);
      if (snap.tab === 'name' || snap.tab === 'category') setTab(snap.tab);
      if (snap.filters) setFilters({ ...DEFAULT_FILTERS, ...snap.filters });
    } catch {
      /* snapshot rusak — abaikan */
    }
  }, []);

  useEffect(() => {
    if (DEMO) return;
    let cancelled = false;
    fetch('/api/categories', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { categories?: Category[] } | null) => {
        if (cancelled || !json?.categories?.length) return;
        setCategories(json.categories);
        setCategoryId((current) => (json.categories?.some((item) => item.id === current) ? current : json.categories![0].id));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string, isError = false) => setToast({ message, error: isError }), []);

  function mutate(updater: (state: PrototypeState) => PrototypeState) {
    setProto((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      savePrototypeState(next);
      return next;
    });
  }

  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? null;
  const account = proto ? activeAccount(proto) : { plan: 'Free' as const, credits: 0 };
  const categoriesForCity = citiesForProvince(province);

  const queryPreview =
    tab === 'category'
      ? `"${category?.keyword ?? 'usaha lokal'} di ${city}"`
      : `"${nameQuery.trim() || 'nama usaha'} di ${city}"`;

  const filteredLeads = useMemo(() => applyFilters(leads, filters), [leads, filters]);
  const visibleLeads = useMemo(() => {
    if (!proto || statusFilter === 'all') return filteredLeads;
    return filteredLeads.filter((lead) => (proto.statuses[lead.placeId] ?? 'New') === statusFilter);
  }, [filteredLeads, proto, statusFilter]);

  const counts = useMemo(() => {
    const base: Record<LeadStatus | 'all', number> = { all: filteredLeads.length, New: 0, Contacted: 0, Interested: 0, Closed: 0 };
    for (const lead of filteredLeads) {
      const status = proto?.statuses[lead.placeId] ?? 'New';
      base[status] += 1;
    }
    return base;
  }, [filteredLeads, proto]);

  const withPhone = useMemo(
    () => filteredLeads.filter((lead) => normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)).length,
    [filteredLeads],
  );

  async function runSearch(refresh = false) {
    if (loading || !proto) return;
    if (tab === 'name' && nameQuery.trim().length < 2) {
      setError('Isi nama usaha / brand minimal 2 karakter.');
      return;
    }
    if (!city.trim()) {
      setError('Pilih kota terlebih dahulu.');
      return;
    }

    const charged = spendCredit(proto);
    if (!charged) {
      setShowUpgrade(true);
      return;
    }
    setProto(charged);
    savePrototypeState(charged);

    setLoading(true);
    setError(null);
    setStatusFilter('all');
    try {
      let results: Prospect[] = [];
      let nextMeta: Meta;

      if (mode === 'demo') {
        await new Promise((resolve) => window.setTimeout(resolve, 420));
        const payload = mockSearch({
          tab,
          category: tab === 'category' ? category : null,
          name: nameQuery,
          city,
          refresh,
        });
        results = payload.results;
        nextMeta = payload.meta;
      } else {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            tab === 'name'
              ? { name: nameQuery.trim(), city, refresh }
              : { categoryId: category?.id, city, refresh },
          ),
        });
        const json = (await res.json()) as
          | { ok: true; results: Prospect[]; meta: Meta }
          | { ok: false; error?: string };
        if (!res.ok || !('ok' in json) || !json.ok) {
          throw new Error(('error' in json && json.error) || 'Gagal mencari prospek dari API.');
        }
        results = json.results;
        nextMeta = json.meta;
      }

      const normalized = results.map((lead) => ({ ...lead, city: lead.city ?? city }));
      setLeads(normalized);
      setMeta(nextMeta);
      try {
        const snapshot: SearchSnapshot = {
          leads: normalized,
          meta: nextMeta,
          city,
          province,
          categoryId,
          nameQuery,
          tab,
          filters,
        };
        window.localStorage.setItem(SEARCH_KEY, JSON.stringify(snapshot));
      } catch {
        /* storage penuh — abaikan */
      }
      notify(`${results.length} prospek tanpa website ditemukan · 1 kredit terpakai.`);
    } catch (err) {
      setProto((prev) => {
        if (!prev) return prev;
        const restored = refundCredit(prev);
        savePrototypeState(restored);
        return restored;
      });
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari prospek.');
    } finally {
      setLoading(false);
    }
  }

  function changeStatus(placeId: string, status: LeadStatus) {
    mutate((state) => ({ ...state, statuses: { ...state.statuses, [placeId]: status } }));
    const label = LEAD_STATUSES.find((item) => item.value === status)?.label ?? status;
    notify(`Status diperbarui: ${label}.`);
  }

  function saveTemplates(templates: WaTemplate[]) {
    mutate((state) => ({ ...state, templates }));
  }

  function doUpgrade() {
    mutate((state) => upgradeToPro(state));
    setShowUpgrade(false);
    notify('Akun demo di-upgrade ke Pro. Kuota kredit diisi ulang.');
  }

  function exportCsv() {
    if (!proto || visibleLeads.length === 0) return;
    const csv = buildProspectCsv(visibleLeads, proto.statuses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = csvFileName(meta?.sector, city);
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${visibleLeads.length} prospek diekspor ke CSV.`);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/login';
  }

  const scanned = meta?.scanned ?? 0;
  const skipped = meta?.skippedWithWebsite ?? 0;
  const tableNote = meta
    ? `${meta.query} · ${scanned} tempat dipindai · ${skipped} dibuang karena sudah punya website`
    : 'Belum ada pencarian — pilih kategori/kota lalu klik Cari Prospek.';

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">CF</span>
            <span>
              <span className="brand-name">ClientFinder</span>
              <span className="brand-sub">Prospect finder · prototype</span>
            </span>
          </Link>

          <span className="topbar-badge hide-sm">Prototype mode</span>
          <div className="topbar-spacer" />

          <div className="mode-switch" role="group" aria-label="Sumber data">
            <button
              type="button"
              className={mode === 'demo' ? 'active' : ''}
              onClick={() => setMode('demo')}
              title="Data mock lokal — tanpa konsumsi API key"
            >
              Demo / Mock
            </button>
            <button
              type="button"
              className={mode === 'live' ? 'active' : ''}
              onClick={() => setMode('live')}
              disabled={DEMO}
              title={DEMO ? 'Build statis tanpa server — Live API hanya di deploy Node' : 'Google Places API asli'}
            >
              Live API
            </button>
          </div>

          {proto ? (
            <UserMenu
              state={proto}
              onSwitch={(userId) => mutate((state) => ({ ...state, activeUserId: userId }))}
              onUpgrade={() => setShowUpgrade(true)}
              onTemplates={() => setShowTemplates(true)}
            />
          ) : null}

          {!DEMO ? (
            <button type="button" className="top-btn" onClick={logout}>
              Keluar
            </button>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        <div className="page-head">
          <div>
            <h1>Cari prospek yang belum punya website</h1>
            <p>
              Multi-user demo, kuota kredit, template WhatsApp, pipeline status, dan export CSV — semua
              berjalan tanpa database eksternal.
            </p>
          </div>
          <div className="head-actions">
            {!DEMO ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowCategories(true)}>
                Kelola kategori
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowTemplates(true)}>
              Template WA
            </button>
          </div>
        </div>

        <section className="card search-card">
          <div className="search-tabs" role="tablist" aria-label="Mode pencarian">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'category'}
              className={`search-tab ${tab === 'category' ? 'active' : ''}`}
              onClick={() => setTab('category')}
            >
              <span className="tab-icon">▦</span>
              <span>
                <strong>Kategori &amp; Kota</strong>
                <small>Contoh: Lapangan Futsal di Jakarta Selatan</small>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'name'}
              className={`search-tab ${tab === 'name' ? 'active' : ''}`}
              onClick={() => setTab('name')}
            >
              <span className="tab-icon">⌕</span>
              <span>
                <strong>Nama Usaha Langsung</strong>
                <small>Contoh: Kopi Kenangan di Tebet</small>
              </span>
            </button>
          </div>

          <div className="search-body">
            <div className="search-grid">
              {tab === 'category' ? (
                <label className="field search-field">
                  <span>Kategori usaha</span>
                  <select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sector} — {item.subCategory}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field search-field">
                  <span>Nama toko / brand</span>
                  <input
                    className="input"
                    value={nameQuery}
                    onChange={(event) => setNameQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void runSearch();
                    }}
                    placeholder="Contoh: Kopi Kenangan"
                    maxLength={80}
                  />
                </label>
              )}

              <label className="field search-field">
                <span>Provinsi</span>
                <select
                  className="select"
                  value={province}
                  onChange={(event) => {
                    const next = event.target.value;
                    setProvince(next);
                    setCity(defaultCityFor(next));
                  }}
                >
                  {JAVA_PROVINCES.map((group) => (
                    <option key={group.province} value={group.province}>
                      {group.province}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field search-field">
                <span>Kota / kabupaten</span>
                <select className="select" value={city} onChange={(event) => setCity(event.target.value)}>
                  {categoriesForCity.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  {!categoriesForCity.includes(city) ? <option value={city}>{city}</option> : null}
                </select>
              </label>
            </div>

            <div className="filter-row">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={filters.phoneOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, phoneOnly: event.target.checked }))}
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
                Hanya yang punya nomor telepon / WhatsApp
              </label>

              <label className="mini-field">
                <span>Minimal rating</span>
                <select
                  className="select select-sm"
                  value={filters.minRating}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minRating: Number(event.target.value) }))}
                >
                  <option value={0}>Semua rating</option>
                  <option value={3.5}>≥ 3.5 bintang</option>
                  <option value={4}>≥ 4.0 bintang</option>
                  <option value={4.5}>≥ 4.5 bintang</option>
                </select>
              </label>

              <label className="mini-field">
                <span>Minimal ulasan</span>
                <select
                  className="select select-sm"
                  value={filters.minReviews}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minReviews: Number(event.target.value) }))}
                >
                  <option value={0}>Semua ulasan</option>
                  <option value={10}>≥ 10 ulasan</option>
                  <option value={50}>≥ 50 ulasan</option>
                  <option value={100}>≥ 100 ulasan</option>
                </select>
              </label>

              <span className="filter-note">Website wajib kosong</span>
            </div>
          </div>

          <div className="search-foot">
            <span className="query-preview">
              Query: <code>{queryPreview}</code>
              <span className="search-mode-note">
                {mode === 'demo' ? 'Mock data lokal' : mockMode && !DEMO ? 'Server tanpa API key → mock' : 'Google Places API'}
              </span>
            </span>
            <button
              type="button"
              className="btn btn-primary search-btn"
              onClick={() => void runSearch()}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Mencari…' : 'Cari Prospek'}
              <span className="cost-pill">1 kredit</span>
            </button>
          </div>
        </section>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Tempat dipindai</span>
            <strong>{scanned}</strong>
            <small>{meta ? `${meta.pagesScanned} halaman` : 'belum ada pencarian'}</small>
          </div>
          <div className="stat-card">
            <span className="stat-label">Dibuang (punya website)</span>
            <strong>{skipped}</strong>
            <small>filter wajib aktif</small>
          </div>
          <div className="stat-card">
            <span className="stat-label">Lolos filter</span>
            <strong>{filteredLeads.length}</strong>
            <small>{withPhone} punya nomor telepon</small>
          </div>
          <div className="stat-card accent">
            <span className="stat-label">Kredit tersisa</span>
            <strong>{account.credits}</strong>
            <small>paket {account.plan}</small>
          </div>
        </div>

        <ProspectTable
          rows={visibleLeads}
          city={city}
          statuses={proto?.statuses ?? {}}
          templates={proto?.templates ?? []}
          counts={counts}
          totalCount={filteredLeads.length}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onStatusChange={changeStatus}
          onExport={exportCsv}
          loading={loading}
          note={tableNote}
        />
      </main>

      {proto && showTemplates ? (
        <TemplateModal
          templates={proto.templates}
          sample={visibleLeads[0] ?? null}
          city={city}
          onSave={saveTemplates}
          onClose={() => setShowTemplates(false)}
          notify={notify}
        />
      ) : null}

      {proto && showUpgrade ? (
        <div className="modal-backdrop center" role="dialog" aria-modal="true" aria-label="Upgrade paket" onClick={() => setShowUpgrade(false)}>
          <div className="modal modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{account.credits > 0 ? 'Tambah kuota kredit' : 'Kuota kredit habis'}</h2>
                <p>Demo simulasi upgrade — tidak ada payment gateway.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowUpgrade(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="upgrade-grid">
                <div className="plan-card">
                  <span className="plan-badge free">Free</span>
                  <strong>5 kredit / bulan</strong>
                  <ul>
                    <li>Pencarian kategori &amp; nama usaha</li>
                    <li>1 kredit per pencarian</li>
                    <li>Export CSV &amp; template WA</li>
                  </ul>
                  <span className="plan-current">{account.plan === 'Free' ? 'Paket aktif' : 'Sudah dilewati'}</span>
                </div>
                <div className="plan-card featured">
                  <span className="plan-badge pro">Pro</span>
                  <strong>500 kredit / bulan</strong>
                  <ul>
                    <li>Semua fitur Free</li>
                    <li>Kuota 100× lebih besar</li>
                    <li>Prioritas pencarian Live API</li>
                  </ul>
                  <button type="button" className="btn btn-primary btn-block" onClick={doUpgrade}>
                    Upgrade ke Pro (demo)
                  </button>
                </div>
              </div>
              <p className="upgrade-note">
                Akun aktif: <b>{proto ? proto.activeUserId : ''}</b> · sisa {account.credits} kredit. Upgrade
                hanya mengubah state lokal (localStorage) — cukup untuk mendemokan flow limitasi kredit.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showCategories && !DEMO ? (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChange={(next) => {
            setCategories(next);
            if (!next.some((item) => item.id === categoryId)) setCategoryId(next[0]?.id ?? '');
          }}
          notify={notify}
        />
      ) : null}

      <div className="toast-wrap">
        {toast ? <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.message}</div> : null}
      </div>
    </div>
  );
}
