'use client';

import { useEffect, useRef, useState } from 'react';
import type { Prospect } from '@/lib/types';
import {
  LEAD_STATUSES,
  linkedInXrayUrl,
  normalizeWaPhone,
  waLink,
  type LeadStatus,
  type WaTemplate,
} from '@/lib/prototype';

const PAGE_SIZE = 20;

export default function ProspectTable({
  rows,
  city,
  statuses,
  templates,
  counts,
  totalCount,
  statusFilter,
  onStatusFilter,
  onStatusChange,
  onExport,
  loading,
  note,
}: {
  rows: Prospect[];
  city: string;
  statuses: Record<string, LeadStatus>;
  templates: WaTemplate[];
  counts: Record<LeadStatus | 'all', number>;
  totalCount: number;
  statusFilter: LeadStatus | 'all';
  onStatusFilter: (value: LeadStatus | 'all') => void;
  onStatusChange: (placeId: string, status: LeadStatus) => void;
  onExport: () => void;
  loading?: boolean;
  note?: string;
}) {
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, rows.length);

  useEffect(() => {
    setPage(1);
  }, [rows, statusFilter]);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  function sendWa(lead: Prospect, template: WaTemplate) {
    const url = waLink(lead, template.body, city || lead.city || '');
    setOpenMenu(null);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="card results-card">
      <div className="card-head results-head">
        <div className="results-title">
          <strong>{totalCount} prospek</strong>
          <span className="cell-sub">{note ?? 'Tanpa website · siap dihubungi'}</span>
        </div>

        <div className="pipeline-chips" role="group" aria-label="Filter status pipeline">
          <button
            type="button"
            className={`chip-filter ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => onStatusFilter('all')}
          >
            Semua <b>{counts.all}</b>
          </button>
          {LEAD_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              className={`chip-filter st-${status.value.toLowerCase()} ${statusFilter === status.value ? 'active' : ''}`}
              onClick={() => onStatusFilter(status.value)}
              title={status.hint}
            >
              {status.label} <b>{counts[status.value]}</b>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-sm btn-navy export-btn" onClick={onExport} disabled={rows.length === 0}>
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="table-wrap">
          <table className="prospects">
            <tbody>
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="skeleton-row">
                  <td colSpan={7}>
                    <div className="skeleton-bar" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⌕</div>
          <h3>Belum ada prospek yang cocok</h3>
          <p>
            Coba longgarkan filter rating/ulasan, matikan filter nomor telepon, atau ganti kota. Filter
            &quot;tanpa website&quot; selalu aktif.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="prospects">
              <thead>
                <tr>
                  <th>Bisnis</th>
                  <th>Kategori</th>
                  <th>Rating</th>
                  <th>Kontak</th>
                  <th>Pitch angle</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const status = statuses[row.placeId] ?? 'New';
                  const phone = normalizeWaPhone(row.whatsapp ?? row.phoneRaw);
                  return (
                    <tr key={row.placeId}>
                      <td data-label="Bisnis">
                        <div className="biz-name">{row.name}</div>
                        <div className="addr">
                          {row.address}
                          {row.mapsUrl ? (
                            <>
                              {' · '}
                              <a className="map-link" href={row.mapsUrl} target="_blank" rel="noreferrer">
                                Maps
                              </a>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td data-label="Kategori">
                        <span className="chip">{row.subCategory}</span>
                        <span className="cell-sub">{row.sector}</span>
                      </td>
                      <td data-label="Rating">
                        {row.rating === null ? (
                          <span className="wa-none">tanpa rating</span>
                        ) : (
                          <div className="rating">
                            <span className="star">★</span>
                            {row.rating.toFixed(1)}
                            <span className="reviews">({row.reviews})</span>
                          </div>
                        )}
                      </td>
                      <td data-label="Kontak">
                        {phone ? (
                          <>
                            <div className="mono phone-cell">{row.phoneDisplay ?? phone}</div>
                            <a className="wa-link" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">
                              wa.me/{phone}
                            </a>
                          </>
                        ) : (
                          <span className="wa-none">tanpa telepon</span>
                        )}
                      </td>
                      <td data-label="Pitch angle">
                        <p className="pitch-cell">{row.pitch}</p>
                      </td>
                      <td data-label="Status">
                        <select
                          className={`status-select st-${status.toLowerCase()}`}
                          value={status}
                          onChange={(event) => onStatusChange(row.placeId, event.target.value as LeadStatus)}
                          aria-label={`Status pipeline ${row.name}`}
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
                          <div className="wa-split" ref={openMenu === row.placeId ? menuRef : undefined}>
                            <button
                              type="button"
                              className="btn btn-sm btn-wa"
                              disabled={!phone || templates.length === 0}
                              onClick={() => templates[0] && sendWa(row, templates[0])}
                              title={phone ? 'Kirim WhatsApp dengan template pertama' : 'Nomor WhatsApp tidak tersedia'}
                            >
                              Kirim WA
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-wa caret"
                              disabled={!phone || templates.length === 0}
                              onClick={() => setOpenMenu((current) => (current === row.placeId ? null : row.placeId))}
                              aria-label={`Pilih template WhatsApp untuk ${row.name}`}
                              aria-expanded={openMenu === row.placeId}
                            >
                              ▾
                            </button>
                            {openMenu === row.placeId ? (
                              <div className="wa-menu" role="menu">
                                {templates.map((template) => (
                                  <button
                                    key={template.id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => sendWa(row, template)}
                                  >
                                    {template.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <a
                            className="icon-btn li"
                            href={linkedInXrayUrl(row.name, city || row.city || 'Jakarta')}
                            target="_blank"
                            rel="noreferrer"
                            title={`Cari owner ${row.name} di LinkedIn (Google X-Ray)`}
                          >
                            in
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="table-toolbar">
            <span>
              Menampilkan <b>{start}</b>–<b>{end}</b> dari <b>{rows.length}</b> prospek terfilter
              {rows.length !== totalCount ? ` (dari ${totalCount} hasil)` : ''}
            </span>
            <div className="pager">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
              >
                ← Sebelumnya
              </button>
              <span className="page-indicator">
                {safePage} / {pageCount}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={safePage >= pageCount}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
