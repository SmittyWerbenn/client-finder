'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Prospect } from '@/lib/types';
import { DEFAULT_TEMPLATES, fillTemplate, normalizeWaPhone, templateContextFor, type WaTemplate } from '@/lib/prototype';

const PLACEHOLDERS = ['{{business_name}}', '{{city}}', '{{pitch_angle}}', '{{catalog_url}}'];

const FALLBACK_LEAD: Prospect = {
  placeId: 'preview',
  name: 'Kopi Senja Tebet',
  address: 'Jl. Tebet Timur Dalam Raya No. 41, Jakarta Selatan',
  city: 'Jakarta Selatan',
  phoneRaw: '6281388772041',
  phoneDisplay: '0813-8877-2041',
  whatsapp: '6281388772041',
  website: null,
  rating: 4.4,
  reviews: 96,
  mapsUrl: 'https://www.google.com/maps',
  sector: 'F&B',
  subCategory: 'Kedai Kopi',
  pitch: 'Katalog menu + galeri suasana cafe supaya wisatawan lokal menemukan tempat ini dari Google.',
};

export default function TemplateModal({
  templates,
  sample,
  city,
  onSave,
  onClose,
  notify,
}: {
  templates: WaTemplate[];
  sample: Prospect | null;
  city: string;
  onSave: (templates: WaTemplate[]) => void;
  onClose: () => void;
  notify: (message: string, isError?: boolean) => void;
}) {
  const [drafts, setDrafts] = useState<WaTemplate[]>(() => templates.map((tpl) => ({ ...tpl })));
  const [activeId, setActiveId] = useState<string>(templates[0]?.id ?? '');

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const active = drafts.find((tpl) => tpl.id === activeId) ?? drafts[0];
  const previewLead = sample ?? FALLBACK_LEAD;
  const previewText = useMemo(
    () => (active ? fillTemplate(active.body, templateContextFor(previewLead, city || previewLead.city || 'Jakarta Selatan')) : ''),
    [active, previewLead, city],
  );
  const waPhone = normalizeWaPhone(previewLead.whatsapp ?? previewLead.phoneRaw);

  function update(id: string, patch: Partial<WaTemplate>) {
    setDrafts((prev) => prev.map((tpl) => (tpl.id === id ? { ...tpl, ...patch } : tpl)));
  }

  function addTemplate() {
    const id = `tpl-custom-${Date.now().toString(36)}`;
    const next: WaTemplate = {
      id,
      name: `Template Baru ${drafts.length + 1}`,
      body: 'Halo {{business_name}}! Saya dari ClientFinder. Bisnis Anda di {{city}} belum punya website. {{pitch_angle}} Contoh katalog: {{catalog_url}}.',
    };
    setDrafts((prev) => [...prev, next]);
    setActiveId(id);
  }

  function removeTemplate(id: string) {
    setDrafts((prev) => {
      if (prev.length <= 1) {
        notify('Minimal satu template harus tersimpan.', true);
        return prev;
      }
      const next = prev.filter((tpl) => tpl.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? '');
      return next;
    });
  }

  function appendPlaceholder(token: string) {
    if (!active) return;
    update(active.id, { body: `${active.body.trimEnd()} ${token}` });
  }

  function save() {
    const cleaned = drafts
      .map((tpl) => ({ ...tpl, name: tpl.name.trim(), body: tpl.body.trim() }))
      .filter((tpl) => tpl.name.length > 0 && tpl.body.length > 0);
    if (cleaned.length === 0) {
      notify('Isi minimal satu template dengan nama dan pesan.', true);
      return;
    }
    onSave(cleaned);
    notify(`${cleaned.length} template WhatsApp disimpan.`);
    onClose();
  }

  function restoreDefaults() {
    const defaults = DEFAULT_TEMPLATES.map((tpl) => ({ ...tpl }));
    setDrafts(defaults);
    setActiveId(defaults[0]?.id ?? '');
    notify('Template dikembalikan ke bawaan (belum disimpan).');
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Template WhatsApp" onClick={onClose}>
      <div className="modal modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Template WhatsApp Broadcast</h2>
            <p>Placeholder otomatis terisi dari data prospek saat tombol Kirim WA diklik.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="modal-body template-grid">
          <section className="template-list">
            <p className="modal-section-title">Daftar template</p>
            {drafts.map((tpl) => (
              <article
                key={tpl.id}
                className={`template-card ${tpl.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(tpl.id)}
              >
                <div className="template-card-head">
                  <input
                    className="input input-compact"
                    value={tpl.name}
                    onChange={(event) => update(tpl.id, { name: event.target.value })}
                    aria-label="Nama template"
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Hapus template"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeTemplate(tpl.id);
                    }}
                  >
                    ×
                  </button>
                </div>
                <textarea
                  className="textarea"
                  rows={4}
                  value={tpl.body}
                  onFocus={() => setActiveId(tpl.id)}
                  onChange={(event) => update(tpl.id, { body: event.target.value })}
                  aria-label={`Isi pesan ${tpl.name}`}
                />
              </article>
            ))}
            <div className="template-actions">
              <button type="button" className="btn btn-sm btn-ghost" onClick={addTemplate}>
                + Tambah template
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={restoreDefaults}>
                Reset bawaan
              </button>
            </div>
          </section>

          <section className="template-preview">
            <p className="modal-section-title">Pratinjau dengan prospek terpilih</p>
            <div className="preview-lead">
              <strong>{previewLead.name}</strong>
              <span>
                {previewLead.subCategory} · {city || previewLead.city}
              </span>
            </div>
            <div className="preview-bubble">{previewText || 'Pilih template untuk melihat pratinjau.'}</div>
            <p className="preview-meta">
              {previewText.length} karakter · {waPhone ? `wa.me/${waPhone}` : 'nomor WhatsApp tidak tersedia'}
            </p>
            <p className="modal-section-title">Placeholder</p>
            <div className="placeholder-row">
              {PLACEHOLDERS.map((token) => (
                <button key={token} type="button" className="placeholder-chip" onClick={() => appendPlaceholder(token)}>
                  {token}
                </button>
              ))}
            </div>
            <p className="preview-hint">Klik placeholder untuk menambahkannya ke akhir template yang sedang dibuka.</p>
          </section>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Simpan template
          </button>
        </div>
      </div>
    </div>
  );
}
