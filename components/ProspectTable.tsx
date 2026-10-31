'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lead, LeadStatus } from '@/lib/types';
import type { SessionUser } from '@/lib/auth';
import BroadcastModal from './BroadcastModal';
import {
  LEAD_STATUSES,
  linkedInXrayUrl,
  normalizeWaPhone,
  waLink,
  type WaTemplate,
} from '@/lib/outreach';

const PAGE_SIZE = 20;

function websiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

export default function ProspectTable({
  rows,
  totalCount,
  city,
  templates,
  counts,
  statusFilter,
  onStatusFilter,
  onStatusChange,
  onClaim,
  user,
  demo = false,
  onExport,
  notify,
  loading,
  note,
}: {
  rows: Lead[];
  totalCount: number;
  city: string;
  templates: WaTemplate[];
  counts: Record<LeadStatus | 'all', number>;
  statusFilter: LeadStatus | 'all';
  onStatusFilter: (value: LeadStatus | 'all') => void;
  onStatusChange: (id: string, status: LeadStatus, silent?: boolean) => void;
  onClaim: (id: string, action: 'claim' | 'release') => void;
  user: SessionUser;
  demo?: boolean;
  onExport: () => void;
  notify: (message: string, isError?: boolean) => void;
  loading?: boolean;
  note?: string;
}) {
  const [page, setPage] = useState(1);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const lockedFor = (lead: Lead): boolean =>
    Boolean(lead.assignedToId) && lead.assignedToId !== user.id && user.role !== 'ADMIN';

  const broadcastCount = rows.filter((lead) => normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)).length;

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

  function sendWa(lead: Lead, template: WaTemplate) {
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
          <span className="cell-sub">{note ?? 'Data prospek · siap dihubungi'}</span>
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

        <div className="results-actions">
          <button
            type="button"
            className="btn btn-sm btn-broadcast"
            onClick={() => setShowBroadcast(true)}
            disabled={broadcastCount === 0 || templates.length === 0}
            title={
              broadcastCount === 0
                ? 'Tidak ada prospek dengan nomor WhatsApp valid'
                : 'Kirim template WA ke semua kontak di tabel secara berurutan'
            }
          >
            Broadcast WhatsApp Semua ({broadcastCount} Kontak)
          </button>
          <button type="button" className="btn btn-sm btn-navy export-btn" onClick={onExport} disabled={rows.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="table-wrap">
          <table className="prospects">
            <tbody>
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="skeleton-row">
                  <td colSpan={8}>
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
            Jalankan pencarian baru, longgarkan filter rating/ulasan, atau ubah filter status website. Filter
            &quot;tanpa website&quot; hanya opsional, bukan syarat sistem.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="prospects prospects--search">
              <colgroup>
                <col className="col-biz" />
                <col className="col-web" />
                <col className="col-cat" />
                <col className="col-rating" />
                <col className="col-contact" />
                <col className="col-pitch" />
                <col className="col-status" />
                <col className="col-aksi" />
              </colgroup>
              <thead>
                <tr>
                  <th>Bisnis</th>
                  <th>Website</th>
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
                  const phone = normalizeWaPhone(row.whatsapp ?? row.phoneRaw);
                  return (
                    <tr key={row.id}>
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
                      <td data-label="Website">
                        {row.website ? (
                          <a
                            className="web-link"
                            href={row.website}
                            target="_blank"
                            rel="noreferrer"
                            title={row.website}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="8.5" />
                              <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z" />
                            </svg>
                            <span className="web-host">{websiteHost(row.website)}</span>
                          </a>
                        ) : (
                          <span className="web-badge">Belum Ada Web</span>
                        )}
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
                        <p className="pitch-cell" title={row.pitch}>{row.pitch}</p>
                      </td>
                      <td data-label="Status">
                        <select
                          className={`status-select st-${row.status.toLowerCase()}`}
                          value={row.status}
                          onChange={(event) => onStatusChange(row.id, event.target.value as LeadStatus)}
                          disabled={lockedFor(row)}
                          title={lockedFor(row) ? `Lead dikunci oleh ${row.assignedToName ?? 'staf lain'}` : undefined}
                          aria-label={`Status pipeline ${row.name}`}
                        >
                          {LEAD_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {row.assignedToId ? (
                          <span className={`cell-sub ${row.assignedToId === user.id ? 'mine' : ''}`}>
                            {row.assignedToId === user.id ? 'Dipegang Anda' : `Dipegang ${row.assignedToName ?? 'staf lain'}`}
                          </span>
                        ) : null}
                      </td>
                      <td data-label="Aksi">
                        <div className="row-actions">
                          {!demo && row.assignedToId === user.id ? (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onClaim(row.id, 'release')}>
                              Lepas
                            </button>
                          ) : null}
                          {!demo && !row.assignedToId && user.role !== 'ADMIN' ? (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onClaim(row.id, 'claim')}>
                              Ambil
                            </button>
                          ) : null}
                          <div className="wa-split" ref={openMenu === row.id ? menuRef : undefined}>
                            <button
                              type="button"
                              className="btn btn-sm btn-wa"
                              disabled={!phone || templates.length === 0}
                              onClick={() => templates[0] && sendWa(row, templates[0])}
                              title={phone ? 'Kirim WhatsApp dengan template pertama' : 'Nomor WhatsApp tidak tersedia'}
                              aria-label={`Kirim WhatsApp ke ${row.name}`}
                            >
                              <svg className="wa-ico" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-wa caret"
                              disabled={!phone || templates.length === 0}
                              onClick={() => setOpenMenu((current) => (current === row.id ? null : row.id))}
                              aria-label={`Pilih template WhatsApp untuk ${row.name}`}
                              aria-expanded={openMenu === row.id}
                            >
                              ▾
                            </button>
                            {openMenu === row.id ? (
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

      {showBroadcast ? (
        <BroadcastModal
          rows={rows}
          city={city}
          templates={templates}
          onStatusChange={onStatusChange}
          onClose={() => setShowBroadcast(false)}
          notify={notify}
        />
      ) : null}
    </div>
  );
}
