'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Prospect } from '@/lib/types';
import {
  fillTemplate,
  normalizeWaPhone,
  templateContextFor,
  type LeadStatus,
  type WaTemplate,
} from '@/lib/prototype';
import { useMassBroadcastQueue } from '@/lib/useMassBroadcastQueue';

const DELAY_OPTIONS = [3, 5, 10];

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} dtk`;
  if (rest === 0) return `${minutes} mnt`;
  return `${minutes} mnt ${rest} dtk`;
}

export default function BroadcastModal({
  rows,
  city,
  templates,
  statuses,
  onStatusChange,
  onClose,
  notify,
}: {
  rows: Prospect[];
  city: string;
  templates: WaTemplate[];
  statuses: Record<string, LeadStatus>;
  onStatusChange: (placeId: string, status: LeadStatus, silent?: boolean) => void;
  onClose: () => void;
  notify: (message: string, isError?: boolean) => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [delaySec, setDelaySec] = useState(5);

  const { snapshot, start, pause, resume, stop, reset } = useMassBroadcastQueue({
    onSent: (lead) => onStatusChange(lead.placeId, 'Contacted', true),
  });

  const recipients = useMemo(
    () => rows.filter((lead) => normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)),
    [rows],
  );
  const skipped = rows.length - recipients.length;
  const alreadyContacted = useMemo(
    () => recipients.filter((lead) => (statuses[lead.placeId] ?? 'New') === 'Contacted').length,
    [recipients, statuses],
  );

  const template = templates.find((item) => item.id === templateId) ?? templates[0] ?? null;
  const busy = snapshot.phase === 'running' || snapshot.phase === 'paused';
  const finished = snapshot.phase === 'done' || snapshot.phase === 'stopped';
  const percent = snapshot.total > 0 ? Math.min(100, Math.round((snapshot.sent / snapshot.total) * 100)) : 0;
  const estimate = formatDuration(recipients.length * delaySec);

  const preview = useMemo(() => {
    if (!template || recipients.length === 0) return '';
    return fillTemplate(template.body, templateContextFor(recipients[0], city || recipients[0].city || ''));
  }, [template, recipients, city]);

  const phaseMessage =
    snapshot.phase === 'running'
      ? `Mengirim ${snapshot.sent} dari ${snapshot.total} prospek...`
      : snapshot.phase === 'paused'
        ? `Dijeda — ${snapshot.sent} dari ${snapshot.total} terkirim`
        : snapshot.phase === 'done'
          ? `Selesai — ${snapshot.sent} dari ${snapshot.total} chat dibuka`
          : `Dihentikan — ${snapshot.sent} dari ${snapshot.total} chat dibuka`;

  function requestClose() {
    if (busy) {
      notify('Hentikan broadcast dulu sebelum menutup jendela ini.', true);
      return;
    }
    reset();
    onClose();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (busy) return;
      reset();
      onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose, reset]);

  useEffect(() => {
    if (snapshot.phase === 'done') {
      notify(`Broadcast selesai: ${snapshot.sent}/${snapshot.total} chat dibuka.`);
    } else if (snapshot.phase === 'stopped') {
      notify(`Broadcast dihentikan di ${snapshot.sent}/${snapshot.total}.`, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.phase]);

  function handleStart() {
    if (!template) {
      notify('Belum ada template pesan untuk dipakai.', true);
      return;
    }
    const ok = start({ leads: recipients, template, delaySec, city });
    if (!ok) notify('Tidak ada nomor WhatsApp valid di tabel ini.', true);
  }

  return (
    <div
      className="modal-backdrop broadcast-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="modal modal-broadcast" role="dialog" aria-modal="true" aria-label="Broadcast WhatsApp massal">
        <div className="modal-head">
          <div>
            <h2>🚀 Broadcast WhatsApp Semua</h2>
            <p>
              Kirim penawaran ke {recipients.length} kontak berurutan · {delaySec} dtk jeda
            </p>
          </div>
          <button type="button" className="modal-close" onClick={requestClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="modal-body">
          {snapshot.phase === 'idle' ? (
            <>
              <div className="broadcast-summary">
                <div>
                  <strong>{recipients.length} kontak siap dibroadcast</strong>
                  <span>
                    {skipped} prospek dilewati karena tanpa nomor valid
                    {alreadyContacted > 0 ? ` · ${alreadyContacted} sudah pernah Contacted` : ''}
                  </span>
                </div>
                <span className="broadcast-badge">Batch {recipients.length}</span>
              </div>

              <label className="field">
                <span>Template pesan</span>
                <select className="select" value={template?.id ?? ''} onChange={(event) => setTemplateId(event.target.value)}>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              {preview ? (
                <div className="broadcast-preview">
                  <span className="broadcast-preview-label">Preview untuk {recipients[0].name}</span>
                  <p>{preview}</p>
                </div>
              ) : null}

              <label className="field">
                <span>Jeda antar chat</span>
                <select
                  className="select"
                  value={delaySec}
                  onChange={(event) => setDelaySec(Number(event.target.value))}
                >
                  {DELAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} detik
                    </option>
                  ))}
                </select>
              </label>

              <div className="broadcast-estimate">
                <span>Estimasi waktu</span>
                <strong>± {estimate}</strong>
                <small>
                  {recipients.length} chat × {delaySec} dtk jeda
                </small>
              </div>

              <p className="broadcast-hint">
                <b>Izinkan pop-up</b> untuk <code>wa.me</code> di browser (ikon pop-up di address bar →{' '}
                <i>Always allow</i>) agar semua tab chat bisa terbuka. Jangan tutup tab ClientFinder selama
                broadcast berjalan — jeda 3–10 dtk mencegah browser freeze dan pop-up blocker.
              </p>
            </>
          ) : (
            <>
              <div className="broadcast-live" aria-live="polite">
                <div className="broadcast-live-head">
                  <span className={`broadcast-state st-${snapshot.phase}`}>
                    {snapshot.phase === 'running'
                      ? 'Berjalan'
                      : snapshot.phase === 'paused'
                        ? 'Dijeda'
                        : snapshot.phase === 'done'
                          ? 'Selesai'
                          : 'Dihentikan'}
                  </span>
                  <b>{phaseMessage}</b>
                </div>

                <div className="broadcast-progress">
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label="Progress broadcast"
                  >
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>
                      <b>{percent}%</b> selesai
                    </span>
                    <span>{formatDuration(snapshot.elapsed)} berjalan</span>
                  </div>
                </div>

                <div className="broadcast-stats">
                  <div>
                    <span>Terkirim</span>
                    <strong>{snapshot.sent}</strong>
                  </div>
                  <div>
                    <span>Sisa</span>
                    <strong>{Math.max(0, snapshot.total - snapshot.sent)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{snapshot.total}</strong>
                  </div>
                </div>

                {snapshot.phase === 'running' ? (
                  <p className="broadcast-next">
                    {snapshot.sent === 0
                      ? 'Membuka chat pertama...'
                      : snapshot.nextIn > 0
                        ? `Chat berikutnya dalam ~${snapshot.nextIn} dtk`
                        : 'Membuka chat berikutnya...'}
                  </p>
                ) : null}

                {snapshot.currentName ? (
                  <p className="broadcast-current">
                    Terakhir dibuka: <b>{snapshot.currentName}</b>
                  </p>
                ) : null}

                {snapshot.blocked > 0 ? (
                  <div className="broadcast-warn">
                    <b>⚠ {snapshot.blocked} tab diblokir pop-up blocker.</b>
                    <span>
                      Klik ikon pop-up di address bar → pilih <i>Always allow</i> untuk wa.me, lalu ulangi
                      broadcast. Status baris yang sudah diproses tetap tercatat Contacted.
                    </span>
                  </div>
                ) : null}

                {finished ? (
                  <div className="broadcast-done">
                    <b>
                      {snapshot.phase === 'done' ? 'Broadcast selesai.' : 'Broadcast dihentikan.'}
                    </b>
                    <span>
                      {snapshot.sent - snapshot.blocked} tab WA berhasil dibuka, {snapshot.blocked} diblokir.
                      Baris yang diproses otomatis menjadi Contacted.
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="modal-foot broadcast-foot">
          {snapshot.phase === 'idle' ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={requestClose}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
                disabled={recipients.length === 0 || !template}
              >
                Mulai Broadcast
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={stop} disabled={!busy}>
                Stop Broadcast
              </button>
              {snapshot.phase === 'running' ? (
                <button type="button" className="btn btn-navy" onClick={pause}>
                  Pause
                </button>
              ) : null}
              {snapshot.phase === 'paused' ? (
                <button type="button" className="btn btn-primary" onClick={resume}>
                  Lanjutkan
                </button>
              ) : null}
              {finished ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={reset}>
                    Ulangi
                  </button>
                  <button type="button" className="btn btn-primary" onClick={requestClose}>
                    Tutup
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
