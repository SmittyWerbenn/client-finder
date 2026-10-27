'use client';

import { useMemo, useState } from 'react';
import type { UsageOverview } from '@/lib/types';
import { apiFetch } from '@/lib/client-api';
import { ROLE_LABELS } from '@/lib/roles';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function UsagePanel({ initialOverview }: { initialOverview: UsageOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quotaPercent = overview.globalLimit > 0 ? Math.min(100, Math.round((overview.globalHits / overview.globalLimit) * 100)) : 0;
  const activeUsers = overview.perUser.filter((row) => row.hits > 0).length;
  const maxDaily = useMemo(() => Math.max(1, ...overview.daily.map((row) => row.hits)), [overview.daily]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<{ overview: UsageOverview }>('/api/admin/usage');
      setOverview(payload.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat metrik.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>API Usage Metrics</h1>
          <p>
            Audit pemakaian Google Places API periode <b>{overview.period}</b> — setiap panggilan Text Search dan Place
            Details tercatat atomik.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Memuat…' : 'Muat Ulang'}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="metrics">
        <div className="metric stat-card">
          <span className="metric-label">Total panggilan bulan ini</span>
          <strong className="metric-value">{overview.globalHits.toLocaleString('id-ID')}</strong>
          <span className="metric-hint">Text Search + Place Details</span>
        </div>
        <div className="metric stat-card accent">
          <span className="metric-label">Pemakaian kuota</span>
          <strong className="metric-value">{quotaPercent}%</strong>
          <span className="metric-hint">
            {overview.globalHits.toLocaleString('id-ID')} / {overview.globalLimit.toLocaleString('id-ID')} hit
          </span>
        </div>
        <div className="metric stat-card">
          <span className="metric-label">User aktif</span>
          <strong className="metric-value">{activeUsers}</strong>
          <span className="metric-hint">dari {overview.totalUsers} akun terdaftar</span>
        </div>
        <div className="metric stat-card">
          <span className="metric-label">Log tercatat</span>
          <strong className="metric-value">{overview.logs.length}</strong>
          <span className="metric-hint">200 aktivitas terbaru</span>
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <div>
            <strong>Aktivitas 30 hari terakhir</strong>
            <span className="cell-sub">Jumlah panggilan keluar ke Google Places API per hari</span>
          </div>
        </div>
        <div className="bar-chart" role="img" aria-label="Grafik pemakaian API 30 hari terakhir">
          {overview.daily.length === 0 ? (
            <p className="filter-note">Belum ada panggilan API yang tercatat.</p>
          ) : (
            overview.daily.map((row) => (
              <div key={row.date} className="bar-chart-col" title={`${row.date}: ${row.hits} hit`}>
                <div className="bar-chart-bar" style={{ height: `${Math.max(4, Math.round((row.hits / maxDaily) * 100))}%` }} />
                <span>{row.date.slice(8)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="usage-grid">
        <div className="card">
          <div className="card-head">
            <strong>Hit per user</strong>
          </div>
          <div className="table-wrap">
            <table className="prospects">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hit</th>
                </tr>
              </thead>
              <tbody>
                {overview.perUser.map((row) => (
                  <tr key={row.userId}>
                    <td data-label="Nama">{row.name}</td>
                    <td data-label="Email">{row.email}</td>
                    <td data-label="Role">{ROLE_LABELS[row.role]}</td>
                    <td data-label="Hit">
                      <b>{row.hits.toLocaleString('id-ID')}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <strong>Audit log pemanggilan API</strong>
            <span className="cell-sub">userId · endpoint · query · status · timestamp</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="prospects">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User</th>
                <th>Endpoint</th>
                <th>Query / Place</th>
                <th>Status</th>
                <th>Durasi</th>
              </tr>
            </thead>
            <tbody>
              {overview.logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Waktu">{formatDate(log.createdAt)}</td>
                  <td data-label="User">
                    <div className="biz-name">{log.userName}</div>
                    <span className="cell-sub">{log.userEmail}</span>
                  </td>
                  <td data-label="Endpoint">
                    <span className={`role-badge ${log.endpoint === 'TEXT_SEARCH' ? 'role-admin' : 'role-user'}`}>
                      {log.endpoint === 'TEXT_SEARCH' ? 'Text Search' : 'Place Details'}
                    </span>
                  </td>
                  <td data-label="Query">
                    <span className="cell-sub">{log.queryParam}</span>
                    {log.placeId ? <span className="cell-sub mono">{log.placeId}</span> : null}
                  </td>
                  <td data-label="Status">
                    <span className={log.status === 'SUCCESS' ? 'dot-live' : 'wa-none'}>
                      {log.status === 'SUCCESS' ? 'Sukses' : `Gagal${log.httpStatus ? ` (${log.httpStatus})` : ''}`}
                    </span>
                  </td>
                  <td data-label="Durasi">{log.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {overview.logs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">▦</div>
            <h3>Belum ada aktivitas API</h3>
            <p>Log akan terisi otomatis saat user menjalankan pencarian prospek.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
