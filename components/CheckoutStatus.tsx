'use client';

import { useCallback, useEffect, useState } from 'react';
import { contactHref, WA_MESSAGES } from '@/lib/site';

type PublicOrder = {
  invoiceNumber: string;
  planName: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  channel: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
};

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

const POLL_MS = 5000;
const MAX_POLLS = 36; // ±3 menit

const STATUS_COPY: Record<PublicOrder['status'], { title: string; body: string }> = {
  PAID: {
    title: 'Pembayaran berhasil',
    body: 'Terima kasih! Kuota paket Anda sedang diaktifkan oleh admin. Simpan nomor invoice ini sebagai bukti.',
  },
  PENDING: {
    title: 'Menunggu pembayaran',
    body: 'Status akan diperbarui otomatis begitu DOKU mengonfirmasi pembayaran Anda.',
  },
  FAILED: {
    title: 'Pembayaran gagal',
    body: 'Pembayaran tidak berhasil diproses. Silakan hubungi admin agar dibuatkan invoice baru.',
  },
  EXPIRED: {
    title: 'Invoice kedaluwarsa',
    body: 'Batas waktu pembayaran sudah lewat. Silakan buat order baru atau hubungi admin.',
  },
};

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CheckoutStatus() {
  const [invoice, setInvoice] = useState('');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState(0);

  const load = useCallback(async (invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(invoiceNumber)}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ order: PublicOrder }> | null;

      if (!payload) {
        setError('Respons server tidak dapat dibaca.');
        return;
      }

      if (payload.ok) {
        setOrder(payload.data.order);
        setError('');
      } else {
        setError(payload.error.message);
      }
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('invoice') || params.get('invoice_number') || '';
    setInvoice(fromQuery);

    if (!fromQuery) {
      setLoading(false);
      setError('Nomor invoice tidak ditemukan di URL. Buka tautan dari email/invoice Anda atau hubungi admin.');
      return;
    }

    void load(fromQuery);
  }, [load]);

  useEffect(() => {
    if (!invoice || order?.status !== 'PENDING' || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPolls((value) => value + 1);
      void load(invoice);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [invoice, order?.status, polls, load]);

  const copy = order ? STATUS_COPY[order.status] : null;

  return (
    <div className="lnd">
      <main className="lnd-section" style={{ paddingTop: 120, minHeight: '100vh' }}>
        <div className="lnd-container" style={{ maxWidth: 640 }}>
          <span className="lnd-kicker">Status Pembayaran</span>

          {loading ? <h1>Memuat status pesanan…</h1> : null}

          {!loading && error ? (
            <>
              <h1>Status tidak tersedia</h1>
              <p style={{ color: 'var(--lnd-muted)', marginTop: 12 }}>{error}</p>
              <div className="lnd-cta-row" style={{ marginTop: 24 }}>
                <a className="lnd-btn lnd-btn-primary" href="/#harga">
                  Kembali ke daftar paket
                </a>
                <a
                  className="lnd-btn lnd-btn-outline"
                  href={contactHref(WA_MESSAGES.paymentHelp)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tanya Admin
                </a>
              </div>
            </>
          ) : null}

          {!loading && order && copy ? (
            <>
              <h1>{copy.title}</h1>
              <p style={{ color: 'var(--lnd-muted)', marginTop: 12 }}>{copy.body}</p>

              <dl className="lnd-status-card">
                <div>
                  <dt>Nomor invoice</dt>
                  <dd>{order.invoiceNumber}</dd>
                </div>
                <div>
                  <dt>Paket</dt>
                  <dd>{order.planName}</dd>
                </div>
                <div>
                  <dt>Nominal</dt>
                  <dd>{formatRupiah(order.amount)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`lnd-status-pill is-${order.status.toLowerCase()}`}>{order.status}</span>
                  </dd>
                </div>
                <div>
                  <dt>Metode bayar</dt>
                  <dd>{order.channel ?? '-'}</dd>
                </div>
                <div>
                  <dt>Dibayar pada</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
                <div>
                  <dt>Dibuat</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt>Batas bayar</dt>
                  <dd>{formatDate(order.expiresAt)}</dd>
                </div>
              </dl>

              {order.status === 'PENDING' ? (
                <p className="lnd-modal-note" style={{ marginTop: 16 }}>
                  Halaman ini menyegarkan status otomatis setiap 5 detik. Jika sudah membayar tetapi status belum
                  berubah, hubungi admin dengan menyertakan nomor invoice.
                </p>
              ) : null}

              <div className="lnd-cta-row" style={{ marginTop: 24 }}>
                <a className="lnd-btn lnd-btn-primary" href="/console/login">
                  Masuk ke Console
                </a>
                <a
                  className="lnd-btn lnd-btn-outline"
                  href={contactHref(`${WA_MESSAGES.paymentHelp} Invoice: ${order.invoiceNumber}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Butuh bantuan / Tanya Admin
                </a>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
