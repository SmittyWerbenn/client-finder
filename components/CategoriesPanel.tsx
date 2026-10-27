'use client';

import { useMemo, useState } from 'react';
import type { Category, PublicUser } from '@/lib/types';
import { apiFetch } from '@/lib/client-api';

type Form = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
  ownerId: string;
};

const EMPTY: Form = { sector: '', subCategory: '', keyword: '', pitch: '', ownerId: '' };

export default function CategoriesPanel({
  initialCategories,
  users,
  isSuperadmin,
  currentUserId,
}: {
  initialCategories: Category[];
  users: PublicUser[];
  isSuperadmin: boolean;
  currentUserId: string;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const category of categories) {
      const list = map.get(category.sector) ?? [];
      list.push(category);
      map.set(category.sector, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'));
  }, [categories]);

  async function sync() {
    const payload = await apiFetch<{ categories: Category[] }>('/api/categories');
    setCategories(payload.categories);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      sector: category.sector,
      subCategory: category.subCategory,
      keyword: category.keyword,
      pitch: category.pitch,
      ownerId: category.ownerId ?? '',
    });
    setError(null);
    setNotice(null);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        sector: form.sector,
        subCategory: form.subCategory,
        keyword: form.keyword,
        pitch: form.pitch,
        ...(isSuperadmin ? { ownerId: form.ownerId || null } : {}),
      };
      await apiFetch(editingId ? `/api/categories/${encodeURIComponent(editingId)}` : '/api/categories', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      await sync();
      setNotice(editingId ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Hapus kategori "${category.subCategory}"?`)) return;
    setBusyId(category.id);
    try {
      await apiFetch(`/api/categories/${encodeURIComponent(category.id)}`, { method: 'DELETE' });
      await sync();
      if (editingId === category.id) reset();
      setNotice('Kategori dihapus.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    } finally {
      setBusyId(null);
    }
  }

  async function restore() {
    if (!window.confirm('Pulihkan seluruh kategori global yang hilang dari katalog default?')) return;
    setBusyId('restore');
    try {
      await apiFetch('/api/categories/reset', { method: 'POST' });
      await sync();
      setNotice('Katalog global dipulihkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulihkan katalog.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>Kategori & Pitch Angle</h1>
          <p>
            {isSuperadmin
              ? 'Kelola katalog global dan kategori khusus per akun.'
              : 'Kategori ini hanya terlihat oleh akun Anda.'}
          </p>
        </div>
        {isSuperadmin ? (
          <div className="head-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void restore()} disabled={busyId === 'restore'}>
              {busyId === 'restore' ? 'Memulihkan…' : 'Pulihkan Katalog Global'}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-info">{notice}</div> : null}

      <div className="cat-layout">
        <div className="card card-pad">
          <form className="form-panel" onSubmit={submit}>
            <h3>{editingId ? 'Edit kategori' : 'Tambah kategori baru'}</h3>

            <div className="field-row">
              <label className="field">
                <span>Sektor / Industri</span>
                <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} maxLength={80} required />
              </label>
              <label className="field">
                <span>Sub-kategori</span>
                <input className="input" value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} maxLength={80} required />
              </label>
            </div>

            <label className="field">
              <span>Keyword pencarian Google Maps</span>
              <input className="input" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="mis. coffee shop" maxLength={120} required />
            </label>

            <label className="field">
              <span>Pitch angle / pain point</span>
              <textarea className="textarea" value={form.pitch} onChange={(e) => setForm({ ...form, pitch: e.target.value })} maxLength={700} required />
            </label>

            {isSuperadmin ? (
              <label className="field">
                <span>Pemilik kategori</span>
                <select className="select" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                  <option value="">Global — dapat dipakai semua Admin</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role}) — khusus akun ini
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="filter-note">
                Kategori otomatis dimiliki akun <b>{currentUserId.slice(0, 8)}…</b> dan hanya bisa diakses oleh Anda.
              </p>
            )}

            <div className="template-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </button>
              {editingId ? (
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Batal Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="cat-column">
          {grouped.map(([sector, items]) => (
            <div key={sector} className="card card-pad">
              <div className="cat-sector">{sector}</div>
              <div className="cat-list">
                {items.map((category) => (
                  <div className={`cat-item ${editingId === category.id ? 'editing' : ''}`} key={category.id}>
                    <div className="cat-top">
                      <div>
                        <div className="cat-name">{category.subCategory}</div>
                        <span className="cat-kw">{category.keyword}</span>
                        {category.isGlobal ? (
                          <span className="default-tag">global</span>
                        ) : (
                          <span className="default-tag">{category.ownerName ?? 'akun'}</span>
                        )}
                      </div>
                      <div className="cat-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(category)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => void remove(category)}
                          disabled={busyId === category.id}
                        >
                          {busyId === category.id ? '…' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                    <div className="cat-pitch">{category.pitch}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="icon">＋</div>
              <h3>Belum ada kategori</h3>
              <p>Tambahkan kategori pertama di formulir sebelah kiri.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
