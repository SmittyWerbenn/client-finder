import { NextResponse } from 'next/server';
import { dokuConfig, verifyNotificationSignature } from '@/lib/doku';
import { getOrderByInvoice, markOrderPaid } from '@/lib/repositories/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DokuNotification = {
  order?: { invoice_number?: string; amount?: number | string };
  transaction?: { status?: string; date?: string; original_request_id?: string };
  channel?: { id?: string };
  acquirer?: { id?: string };
  service?: { id?: string };
};

/**
 * POST /api/doku/notification
 *
 * HTTP Notification dari DOKU (bukan dipanggil browser). Wajib:
 *  1. Verifikasi `Signature` memakai body MENTAH — digest = sha256(body asli).
 *  2. Acknowledge cepat (200) supaya DOKU tidak retry berlebihan.
 *
 * Catatan penting dari dokumentasi DOKU Checkout: notifikasi dengan
 * `transaction.status = FAILED` HARUS diabaikan, karena pelanggan masih bisa
 * memilih kanal pembayaran lain di halaman Checkout. Order hanya berubah ke
 * PAID saat menerima status SUCCESS.
 */
export async function POST(req: Request) {
  const cfg = dokuConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { ok: false, message: 'DOKU belum dikonfigurasi di server.' },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const valid = verifyNotificationSignature(req.headers, rawBody);

  if (!valid) {
    console.warn('[doku] notifikasi ditolak: signature tidak valid', {
      requestId: req.headers.get('request-id'),
      requestTimestamp: req.headers.get('request-timestamp'),
    });
    return NextResponse.json({ ok: false, message: 'Signature tidak valid.' }, { status: 401 });
  }

  let payload: DokuNotification;
  try {
    payload = JSON.parse(rawBody) as DokuNotification;
  } catch {
    return NextResponse.json({ ok: true, message: 'Body bukan JSON, diabaikan.' }, { status: 200 });
  }

  const invoiceNumber = payload.order?.invoice_number?.trim();
  const status = payload.transaction?.status?.toUpperCase();

  if (!invoiceNumber) {
    return NextResponse.json({ ok: true, message: 'invoice_number tidak ada, diabaikan.' }, { status: 200 });
  }

  if (status !== 'SUCCESS') {
    // FAILED / EXPIRED tidak mengubah status order (retry kanal masih mungkin).
    console.info('[doku] notifikasi non-SUCCESS diabaikan', { invoiceNumber, status });
    return NextResponse.json({ ok: true, message: `Status ${status ?? 'unknown'} diabaikan.` }, { status: 200 });
  }

  const order = await getOrderByInvoice(invoiceNumber);
  if (!order) {
    console.warn('[doku] notifikasi untuk invoice tidak dikenal', { invoiceNumber });
    return NextResponse.json({ ok: true, message: 'Invoice tidak dikenal.' }, { status: 200 });
  }

  const notifiedAmount = Number(payload.order?.amount ?? 0);
  if (Number.isFinite(notifiedAmount) && notifiedAmount > 0 && notifiedAmount !== order.amount) {
    console.error('[doku] nominal notifikasi tidak cocok dengan order', {
      invoiceNumber,
      notifiedAmount,
      orderAmount: order.amount,
    });
    return NextResponse.json({ ok: false, message: 'Nominal tidak cocok.' }, { status: 200 });
  }

  await markOrderPaid(invoiceNumber, {
    channel: payload.channel?.id ?? payload.service?.id ?? null,
    payload: rawBody,
  });

  console.info('[doku] order dibayar', {
    invoiceNumber,
    channel: payload.channel?.id ?? null,
    amount: notifiedAmount,
  });

  return NextResponse.json({ ok: true, message: 'Notifikasi diterima.' }, { status: 200 });
}
