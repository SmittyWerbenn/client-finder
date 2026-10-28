import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/db';
import { normalizeNumber } from '@/lib/db';
import type { Order, OrderStatus } from '@/lib/types';

/**
 * Repository order/pembayaran. Satu baris = satu percobaan checkout paket.
 *
 * Alur status: PENDING → PAID (notifikasi DOKU SUCCESS) / FAILED (gagal buat
 * pembayaran) / EXPIRED (lewat payment_due_date). Update bersifat idempotent:
 * notifikasi DOKU bisa datang lebih dari sekali untuk invoice yang sama.
 */

type OrderRow = {
  id: string;
  invoice_number: string;
  user_id: string | null;
  plan_id: string;
  plan_name: string;
  amount: number | string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company: string | null;
  doku_payment_url: string | null;
  doku_token_id: string | null;
  doku_request_id: string | null;
  channel: string | null;
  paid_at: number | string | null;
  expires_at: number | string | null;
  notification_payload: string | null;
  created_at: number | string;
  updated_at: number | string;
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function serialize(row: OrderRow): Order {
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number),
    planId: String(row.plan_id),
    planName: String(row.plan_name),
    amount: normalizeNumber(row.amount),
    status: String(row.status) as OrderStatus,
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    customerPhone: String(row.customer_phone),
    company: row.company === null ? null : String(row.company),
    paymentUrl: row.doku_payment_url === null ? null : String(row.doku_payment_url),
    channel: row.channel === null ? null : String(row.channel),
    paidAt: toIso(row.paid_at),
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Nomor invoice: tanpa simbol (aman untuk semua kanal DOKU), maks 30 char. */
export function buildInvoiceNumber(date = new Date()): string {
  const stamp = date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `CF${stamp}${suffix}`;
}

export type CreateOrderInput = {
  planId: string;
  planName: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string | null;
  userId?: string | null;
  dueMinutes?: number;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const db = await getDatabase();
  const now = Date.now();
  const dueMinutes = input.dueMinutes ?? 60;
  const order: OrderRow = {
    id: randomUUID(),
    invoice_number: buildInvoiceNumber(),
    user_id: input.userId ?? null,
    plan_id: input.planId,
    plan_name: input.planName,
    amount: input.amount,
    status: 'PENDING',
    customer_name: input.customerName,
    customer_email: input.customerEmail.toLowerCase(),
    customer_phone: input.customerPhone,
    company: input.company?.trim() || null,
    doku_payment_url: null,
    doku_token_id: null,
    doku_request_id: null,
    channel: null,
    paid_at: null,
    expires_at: now + dueMinutes * 60_000,
    notification_payload: null,
    created_at: now,
    updated_at: now,
  };

  await db.run(
    `INSERT INTO orders
       (id, invoice_number, user_id, plan_id, plan_name, amount, status,
        customer_name, customer_email, customer_phone, company,
        doku_payment_url, doku_token_id, doku_request_id, channel, paid_at,
        expires_at, notification_payload, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      order.id,
      order.invoice_number,
      order.user_id,
      order.plan_id,
      order.plan_name,
      Number(order.amount),
      order.status,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.company,
      null,
      null,
      null,
      null,
      null,
      Number(order.expires_at ?? 0),
      null,
      Number(order.created_at ?? 0),
      Number(order.updated_at ?? 0),
    ],
  );

  return serialize(order);
}

export async function getOrderByInvoice(invoiceNumber: string): Promise<Order | null> {
  const db = await getDatabase();
  const row = await db.one<OrderRow>('SELECT * FROM orders WHERE invoice_number = ?', [invoiceNumber]);
  return row ? serialize(row) : null;
}

export async function attachDokuPayment(
  invoiceNumber: string,
  payment: { paymentUrl: string; tokenId: string | null; requestId: string | null },
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `UPDATE orders
        SET doku_payment_url = ?, doku_token_id = ?, doku_request_id = ?, updated_at = ?
      WHERE invoice_number = ?`,
    [payment.paymentUrl, payment.tokenId, payment.requestId, Date.now(), invoiceNumber],
  );
}

/**
 * Tandai order PAID. Idempotent: notifikasi berulang tidak mengubah `paid_at`
 * yang sudah tercatat, dan order yang sudah PAID tidak pernah turun status.
 */
export async function markOrderPaid(
  invoiceNumber: string,
  detail: { channel?: string | null; payload?: string | null; amount?: number | null },
): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.one<{ status: string; amount: unknown }>(
    'SELECT status, amount FROM orders WHERE invoice_number = ?',
    [invoiceNumber],
  );
  if (!existing) return false;

  const alreadyPaid = String(existing.status) === 'PAID';
  const now = Date.now();

  if (alreadyPaid) {
    // Tetap simpan payload terakhir untuk audit, tanpa menyentuh paid_at.
    await db.run('UPDATE orders SET notification_payload = ?, updated_at = ? WHERE invoice_number = ?', [
      detail.payload ?? null,
      now,
      invoiceNumber,
    ]);
    return true;
  }

  await db.run(
    `UPDATE orders
        SET status = 'PAID', channel = COALESCE(?, channel), paid_at = ?,
            notification_payload = ?, updated_at = ?
      WHERE invoice_number = ?`,
    [detail.channel ?? null, now, detail.payload ?? null, now, invoiceNumber],
  );
  return true;
}

export async function markOrderFailed(invoiceNumber: string, reason: string): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `UPDATE orders
        SET status = CASE WHEN status = 'PAID' THEN status ELSE 'FAILED' END,
            notification_payload = ?, updated_at = ?
      WHERE invoice_number = ?`,
    [reason.slice(0, 4000), Date.now(), invoiceNumber],
  );
}

export async function listOrders(limit = 50): Promise<Order[]> {
  const db = await getDatabase();
  const rows = await db.all<OrderRow>('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map(serialize);
}
