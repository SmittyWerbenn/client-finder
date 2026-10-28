'use client';

import { useEffect, useState } from 'react';
import { contactHref, WA_MESSAGES } from '@/lib/site';

/**
 * Dialog checkout paket berbayar.
 *
 * Tombol utama "Beli / Order" pada kartu harga membuka dialog ini, bukan
 * WhatsApp. Data pelanggan dipakai untuk membuat order + sesi DOKU Checkout;
 * setelah `paymentUrl` diterima, browser diarahkan ke halaman pembayaran DOKU.
 *
 * Bila server belum punya kredensial DOKU (503 DOKU_NOT_CONFIGURED), dialog
 * menampilkan nomor invoice + tombol WhatsApp admin supaya order tetap bisa
 * dilanjutkan manual.
 */

export type CheckoutPlan = {
  id: 'STARTER' | 'AGENCY_PRO';
  name: string;
  priceLabel: string;
  quota: string;
};

type Props = {
  plan: CheckoutPlan;
  onClose: () => void;
};

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

type CheckoutResult = {
  invoiceNumber: string;
  paymentUrl: string;
  expiredDate: string | null;
};

type NotConfiguredDetails = {
  invoiceNumber?: string;
  adminWhatsappUrl?: string;
};

export default function CheckoutDialog({ plan, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState<NotConfiguredDetails | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [busy, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setFallback(null);
    setBusy(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiEnvelope<CheckoutResult> | null;

      if (!payload) {
        setError('Respons server tidak dapat dibaca. Coba lagi atau hubungi admin.');
        return;
      }

      if (payload.ok) {
        window.location.href = payload.data.paymentUrl;
        return;
      }

      if (payload.error.code === 'DOKU_NOT_CONFIGURED') {
        const details = (payload.error.details ?? {}) as NotConfiguredDetails;
        setFallback({
          invoiceNumber: details.invoiceNumber,
          adminWhatsappUrl:
            details.adminWhatsappUrl ??
            contactHref(
              `${WA_MESSAGES.paymentHelp} Paket: ${plan.name}. Invoice: ${details.invoiceNumber ?? '-'}.`,
            ),
        });
        return;
      }

      if (payload.error.code === 'VALIDATION_ERROR') {
        const details = payload.error.details as Array<{ message: string }> | undefined;
        setError(details?.map((item) => item.message).join(' ') || payload.error.message);
        return;
      }

      setError(payload.error.message);
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="lnd-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="lnd-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <header className="lnd-modal-head">
          <div>
            <span className="lnd-kicker">Checkout</span>
            <h3 id="checkout-title">{plan.name}</h3>
            <p className="lnd-modal-sub">
              {plan.priceLabel} · {plan.quota}
            </p>
          </div>
          <button type="button" className="lnd-modal-close" onClick={onClose} aria-label="Tutup" disabled={busy}>
            ×
          </button>
        </header>

        {fallback ? (
          <div className="lnd-modal-body">
            <p className="lnd-modal-alert">
              Pembayaran online belum aktif di server (kredensial DOKU belum diisi). Order Anda sudah kami catat
              {fallback.invoiceNumber ? (
                <>
                  {' '}
                  dengan nomor invoice <strong>{fallback.invoiceNumber}</strong>
                </>
              ) : null}
              .
            </p>
            <p className="lnd-modal-note">
              Admin akan mengirim detail pembayaran manual. Simpan nomor invoice di atas.
            </p>
            <div className="lnd-modal-actions">
              <a
                className="lnd-btn lnd-btn-primary"
                href={fallback.adminWhatsappUrl ?? contactHref(WA_MESSAGES.paymentHelp)}
                target="_blank"
                rel="noreferrer"
              >
                Hubungi Admin via WhatsApp
              </a>
              <button type="button" className="lnd-btn lnd-btn-outline" onClick={onClose}>
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form className="lnd-modal-body" onSubmit={submit}>
            <label className="lnd-field">
              <span>Nama lengkap</span>
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama sesuai invoice"
                autoComplete="name"
              />
            </label>

            <label className="lnd-field">
              <span>Email aktif</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@perusahaan.com"
                autoComplete="email"
              />
            </label>

            <label className="lnd-field">
              <span>Nomor WhatsApp</span>
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
              />
            </label>

            <label className="lnd-field">
              <span>Nama usaha (opsional)</span>
              <input
                maxLength={80}
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="PT / CV / agency"
                autoComplete="organization"
              />
            </label>

            {error ? (
              <p className="lnd-modal-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="lnd-modal-actions">
              <button type="submit" className="lnd-btn lnd-btn-primary" disabled={busy}>
                {busy ? 'Menyiapkan pembayaran…' : `Bayar ${plan.priceLabel}`}
              </button>
              <a
                className="lnd-btn lnd-btn-outline"
                href={contactHref(`${WA_MESSAGES.paymentHelp} Paket: ${plan.name}.`)}
                target="_blank"
                rel="noreferrer"
              >
                Butuh bantuan / Tanya Admin
              </a>
            </div>

            <p className="lnd-modal-note">
              Anda akan diarahkan ke halaman pembayaran resmi DOKU (Virtual Account, QRIS, e-wallet, kartu kredit).
              Data hanya dipakai untuk menerbitkan invoice dan mengaktifkan kuota.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
