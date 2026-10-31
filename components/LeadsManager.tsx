'use client';

import { useMemo, useState } from 'react';
import type { Lead, LeadStatus } from '@/lib/types';
import { LEAD_STATUSES } from '@/lib/outreach';
import { apiFetch } from '@/lib/client-api';
import { downloadBase64File } from '@/lib/download';

type Form = {
  name: string;
  city: string;
  phone: string;
  address: string;
  sector: string;
  subCategory: string;
  pitch: string;
  status: LeadStatus;
};

type CategoryFacet = { sector: string; subCategory: string; total: number };

const categoryKey = (sector: string, subCategory: string) => `${sector}||${subCategory}`;

const EMPTY: Form = {
  name: '',
  city: '',
  phone: '',
  address: '',
  sector: 'Manual',
  subCategory: 'Input manual',
  pitch: '',
  status: 'New',
};

function leadToForm(lead: Lead): Form {
  return {
    name: lead.name,
    city: lead.city ?? '',
    phone: lead.phoneRaw ?? lead.whatsapp ?? '',
    address: lead.address,
    sector: lead.sector,
    subCategory: lead.subCategory,
    pitch: lead.pitch,
    status: lead.status,
  };
}

export default function LeadsManager({
  initialLeads,
  initialCounts,
  initialCategories,
}: {
  initialLeads: Lead[];
  initialCounts: Record<LeadStatus | 'all', number>;
  initialCategories: CategoryFacet[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [counts, setCounts] = useState(initialCounts);
  const [categories, setCategories] = useState(initialCategories);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [filterSector, filterSubCategory] = useMemo(() => {
    if (!categoryFilter) return ['', ''];
    const [sector, subCategory] = categoryFilter.split('||');
    return [sector ?? '', subCategory ?? ''];
  }, [categoryFilter]);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, CategoryFacet[]>();
    for (const facet of categories) {
      const list = groups.get(facet.sector) ?? [];
      list.push(facet);
      groups.set(facet.sector, list);
    }
    return [...groups.entries()];
  }, [categories]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (filterSector && (lead.sector || 'Tanpa sektor') !== filterSector) return false;
      if (filterSubCategory && (lead.subCategory || 'Tanpa sub-kategori') !== filterSubCategory) return false;
      if (!term) return true;
      return [lead.name, lead.city, lead.whatsapp, lead.ownerName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [leads, statusFilter, filterSector, filterSubCategory, query]);

  const hasFilter = statusFilter !== 'all' || Boolean(categoryFilter) || Boolean(query.trim());

  async function refresh() {
    const payload = await apiFetch<{
      leads: Lead[];
      counts: Record<LeadStatus | 'all', number>;
      categories: CategoryFacet[];
    }>('/api/leads');
    setLeads(payload.leads);
    setCounts(payload.counts);
    if (payload.categories) setCategories(payload.categories);
  }

  async function exportRows() {
    if (visible.length === 0 || exporting) return;
    setExporting(true);
    try {
      const payload = await apiFetch<{ fileBase64: string; fileName: string; mime: string }>('/api/export', {
        method: 'POST',
        body: JSON.stringify({ ids: visible.map((lead) => lead.id) }),
      });
      if (!payload.fileBase64) {
        flash('Tidak ada lead untuk diexport.', true);
        return;
      }
      downloadBase64File(payload.fileBase64, payload.fileName || 'leads.xlsx', payload.mime);
      flash(`${visible.length} lead diexport ke Excel.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Export Excel gagal.', true);
    } finally {
      setExporting(false);
    }
  }

  function flash(message: string, isError = false) {
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const payload = await apiFetch<{ lead: Lead }>(`/api/leads/${encodeURIComponent(editing.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            city: form.city,
            phone: form.phone,
            address: form.address,
            sector: form.sector,
            subCategory: form.subCategory,
            pitch: form.pitch,
            status: form.status,
          }),
        });
        setLeads((current) => current.map((lead) => (lead.id === payload.lead.id ? payload.lead : lead)));
        flash('Profil lead diperbarui.');
      } else {
        const payload = await apiFetch<{ lead: Lead }>('/api/leads', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setLeads((current) => [payload.lead, ...current]);
        flash('Lead manual ditambahkan.');
      }
      await refresh();
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal menyimpan lead.', true);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    const previous = leads;
    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, status } : item)));
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (err) {
      setLeads(previous);
      flash(err instanceof Error ? err.message : 'Gagal memperbarui status.', true);
    }
  }

  async function remove(lead: Lead) {
    if (!window.confirm(`Hapus lead "${lead.name}"? Tindakan ini permanen.`)) return;
    setBusyId(lead.id);
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(lead.id)}`, { method: 'DELETE' });
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      flash('Lead dihapus.');
      await refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal menghapus lead.', true);
    } finally {
      setBusyId(null);
    }
  }

  async function removeByFilter() {
    if (!hasFilter || bulkBusy) return;
    const parts: string[] = [];
    if (statusFilter !== 'all') parts.push(`status ${statusFilter}`);
    if (filterSubCategory) parts.push(`kategori ${filterSubCategory}`);
    if (query.trim()) parts.push(`kata kunci "${query.trim()}"`);
    const scope = parts.length > 0 ? parts.join(', ') : 'semua lead';

    if (!window.confirm(`Hapus semua lead dengan filter: ${scope}?\n\nTindakan ini permanen dan tidak bisa dibatalkan.`)) return;

    setBulkBusy(true);
    try {
      const payload = await apiFetch<{ deleted: number }>('/api/leads', {
        method: 'DELETE',
        body: JSON.stringify({
          status: statusFilter === 'all' ? undefined : statusFilter,
          sector: filterSector || undefined,
          subCategory: filterSubCategory || undefined,
          q: query.trim() || undefined,
        }),
      });
      flash(payload.deleted > 0 ? `${payload.deleted} lead dihapus sesuai filter.` : 'Tidak ada lead yang cocok dengan filter.');
      await refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal menghapus lead.', true);
    } finally {
      setBulkBusy(false);
    }
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
    setError(null);
  }

  function startEdit(lead: Lead) {
    setEditing(lead);
    setForm(leadToForm(lead));
    setShowForm(true);
    setError(null);
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>Database Leads</h1>
          <p>Kelola seluruh prospek yang tersimpan: profil, status pipeline, dan data kontak.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportRows()} disabled={exporting || visible.length === 0}>
            {exporting ? 'Menyiapkan…' : 'Export Excel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            + Tambah Lead
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-info">{notice}</div> : null}

      <div className="card">
        <div className="card-head results-head">
          <div className="pipeline-chips" role="group" aria-label="Filter status">
            <button
              type="button"
              className={`chip-filter ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua <b>{counts.all}</b>
            </button>
            {LEAD_STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                className={`chip-filter st-${status.value.toLowerCase()} ${statusFilter === status.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label} <b>{counts[status.value]}</b>
              </button>
            ))}
          </div>
          <form
            className="inline-search lead-filters"
            onSubmit={(event) => {
              event.preventDefault();
              void refresh().catch((err: unknown) => flash(err instanceof Error ? err.message : 'Gagal memuat.', true));
            }}
          >
            <select
              className="select select-compact"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {categoryGroups.map(([sector, items]) => (
                <optgroup key={sector} label={sector}>
                  {items.map((facet) => (
                    <option key={categoryKey(facet.sector, facet.subCategory)} value={categoryKey(facet.sector, facet.subCategory)}>
                      {facet.subCategory} ({facet.total})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              className="input input-compact"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, kota, nomor…"
            />
            <button type="submit" className="btn btn-sm btn-navy">
              Cari
            </button>
          </form>
        </div>

        {hasFilter ? (
          <div className="lead-filter-bar">
            <span>
              Filter aktif: {statusFilter === 'all' ? 'semua status' : `status ${statusFilter}`}
              {filterSubCategory ? ` · ${filterSubCategory}` : ''}
              {query.trim() ? ` · "${query.trim()}"` : ''} — <b>{visible.length}</b> lead tampil
            </span>
            <div className="lead-filter-actions">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('');
                  setQuery('');
                }}
              >
                Reset filter
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => void removeByFilter()} disabled={bulkBusy}>
                {bulkBusy ? 'Menghapus…' : `Hapus sesuai filter (${visible.length})`}
              </button>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="prospects">
            <thead>
              <tr>
                <th>Bisnis</th>
                <th>Pemilik</th>
                <th>Kontak</th>
                <th>Kota</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id}>
                  <td data-label="Bisnis">
                    <div className="biz-name">{lead.name}</div>
                    <span className="cell-sub">
                      {lead.subCategory} · {lead.source}
                    </span>
                  </td>
                  <td data-label="Pemilik">{lead.ownerName ?? '—'}</td>
                  <td data-label="Kontak">
                    {lead.whatsapp ? (
                      <a className="wa-link" href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer">
                        {lead.phoneDisplay ?? lead.whatsapp}
                      </a>
                    ) : (
                      <span className="wa-none">tanpa telepon</span>
                    )}
                  </td>
                  <td data-label="Kota">{lead.city}</td>
                  <td data-label="Status">
                    <select
                      className={`status-select st-${lead.status.toLowerCase()}`}
                      value={lead.status}
                      onChange={(event) => void changeStatus(lead, event.target.value as LeadStatus)}
                    >
                      {LEAD_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Aksi">
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => startEdit(lead)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => void remove(lead)}
                        disabled={busyId === lead.id}
                      >
                        {busyId === lead.id ? '…' : 'Hapus'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="icon">▤</div>
            <h3>{hasFilter ? 'Tidak ada lead pada filter ini' : 'Belum ada lead'}</h3>
            <p>
              {hasFilter
                ? 'Ubah atau reset filter untuk melihat lead lain.'
                : 'Jalankan pencarian prospek atau tambahkan lead manual.'}
            </p>
          </div>
        ) : (
          <div className="table-toolbar">
            <span>
              Menampilkan <b>{visible.length}</b> dari <b>{leads.length}</b> lead
            </span>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit lead' : 'Tambah lead'}>
            <div className="modal-head">
              <div>
                <h2>{editing ? 'Edit Profil Lead' : 'Tambah Lead Manual'}</h2>
                <p>{editing ? editing.name : 'Masukkan data bisnis yang ditemukan di luar pipeline pencarian.'}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowForm(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                {error ? <div className="alert alert-error">{error}</div> : null}
                <div className="field-row">
                  <label className="field">
                    <span>Nama bisnis *</span>
                    <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={160} />
                  </label>
                  <label className="field">
                    <span>Kota *</span>
                    <input className="input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required maxLength={80} />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>Nomor telepon / WhatsApp</span>
                    <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0812xxxx atau +62812xxxx" maxLength={40} />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatus })}>
                      {LEAD_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Alamat</span>
                  <input className="input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength={300} />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Sektor</span>
                    <input className="input" value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} maxLength={80} />
                  </label>
                  <label className="field">
                    <span>Sub-kategori</span>
                    <input className="input" value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })} maxLength={80} />
                  </label>
                </div>
                <label className="field">
                  <span>Pitch angle</span>
                  <textarea className="textarea" value={form.pitch} onChange={(event) => setForm({ ...form, pitch: event.target.value })} maxLength={700} />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
