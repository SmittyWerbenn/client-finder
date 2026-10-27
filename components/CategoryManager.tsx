'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category } from '@/lib/types';

type FormState = {
  sector: string;
  subCategory: string;
  keyword: string;
  pitch: string;
};

const EMPTY: FormState = { sector: '', subCategory: '', keyword: '', pitch: '' };

export default function CategoryManager({
  categories,
  onClose,
  onChange,
  notify,
}: {
  categories: Category[];
  onClose: () => void;
  onChange: (next: Category[]) => void;
  notify: (message: string, isError?: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const sectorOptions = useMemo(
    () => [...new Set(categories.map((c) => c.sector))].sort((a, b) => a.localeCompare(b, 'id')),
    [categories],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      const list = map.get(c.sector) ?? [];
      list.push(c);
      map.set(c.sector, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'));
  }, [categories]);

  async function sync() {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    const data = (await res.json().catch(() => ({}))) as { categories?: Category[] };
    if (data.categories) onChange(data.categories);
    return data.categories ?? null;
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      sector: category.sector,
      subCategory: category.subCategory,
      keyword: category.keyword,
      pitch: category.pitch,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const payload: FormState = {
      sector: form.sector.trim(),
      subCategory: form.subCategory.trim(),
      keyword: form.keyword.trim(),
      pitch: form.pitch.trim(),
    };

    if (!payload.sector || !payload.subCategory || !payload.keyword || !payload.pitch) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/categories/${encodeURIComponent(editingId)}` : '/api/categories',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Gagal menyimpan kategori.');
        return;
      }
      await sync();
      notify(editingId ? 'Kategori diperbarui.' : 'Kategori baru ditambahkan.');
      resetForm();
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category: Category) {
    if (busyId) return;
    if (!window.confirm(`Hapus kategori "${category.subCategory}"?`)) return;
    setBusyId(category.id);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(category.id)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        notify(data.error ?? 'Gagal menghapus kategori.', true);
        return;
      }
      await sync();
      if (editingId === category.id) resetForm();
      notify('Kategori dihapus.');
    } catch {
      notify('Tidak dapat menghubungi server.', true);
    } finally {
      setBusyId(null);
    }
  }

  async function onReset() {
    if (!window.confirm('Kembalikan daftar kategori ke default? Semua perubahan akan hilang.')) return;
    setBusyId('reset');
    try {
      const res = await fetch('/api/categories/reset', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { categories?: Category[] };
      if (data.categories) onChange(data.categories);
      resetForm();
      notify('Kategori dikembalikan ke default.');
    } catch {
      notify('Gagal mereset kategori.', true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Kelola kategori usaha">
        <div className="modal-head">
          <div>
            <h2>Kelola Kategori Usaha</h2>
            <p>{categories.length} kategori · {sectorOptions.length} sektor</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="modal-body">
          <form className="form-panel" onSubmit={onSubmit}>
            <h3>{editingId ? 'Edit kategori' : 'Tambah kategori baru'}</h3>

            {error && (
              <div className="alert alert-error" role="alert">
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            <div className="field-row">
              <label className="field">
                <span>Nama Sektor / Industri</span>
                <input
                  className="input"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  placeholder="mis. Makanan & Minuman (F&B)"
                  list="sector-options"
                  maxLength={80}
                />
                <datalist id="sector-options">
                  {sectorOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <label className="field">
                <span>Sub-Kategori</span>
                <input
                  className="input"
                  value={form.subCategory}
                  onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                  placeholder="mis. Kafe & Coffee Shop"
                  maxLength={80}
                />
              </label>
            </div>

            <label className="field">
              <span>Keyword Pencarian Google Maps</span>
              <input
                className="input"
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                placeholder="mis. coffee shop"
                maxLength={120}
              />
            </label>

            <label className="field">
              <span>Pitch Angle / Pain Point</span>
              <textarea
                className="textarea"
                value={form.pitch}
                onChange={(e) => setForm({ ...form, pitch: e.target.value })}
                placeholder="Fitur website apa yang paling dibutuhkan usaha ini?"
                maxLength={600}
              />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Menyimpan…
                  </>
                ) : editingId ? (
                  'Simpan Perubahan'
                ) : (
                  'Tambah Kategori'
                )}
              </button>
              {editingId && (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  Batal Edit
                </button>
              )}
            </div>
          </form>

          <p className="modal-section-title">Daftar kategori</p>

          {grouped.map(([sector, items]) => (
            <div key={sector} style={{ marginBottom: 20 }}>
              <div className="cat-sector" style={{ marginBottom: 8 }}>
                {sector}
              </div>
              <div className="cat-list">
                {items.map((c) => (
                  <div
                    className={`cat-item${editingId === c.id ? ' editing' : ''}`}
                    key={c.id}
                  >
                    <div className="cat-top">
                      <div style={{ minWidth: 0 }}>
                        <div className="cat-name">{c.subCategory}</div>
                        <span className="cat-kw">{c.keyword}</span>
                        {c.isDefault && <span className="default-tag" style={{ marginLeft: 8 }}>default</span>}
                      </div>
                      <div className="cat-actions">
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEdit(c)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => void onDelete(c)}
                          disabled={busyId === c.id}
                        >
                          {busyId === c.id ? '…' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                    <div className="cat-pitch">{c.pitch}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!categories.length && (
            <div className="empty-state">
              <div className="icon">＋</div>
              <h3>Belum ada kategori</h3>
              <p>Tambahkan kategori baru di form atas, atau pulihkan daftar default.</p>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onReset} disabled={busyId === 'reset'}>
            {busyId === 'reset' ? 'Mereset…' : 'Kembalikan ke Default'}
          </button>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="btn btn-navy btn-sm" type="button" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
