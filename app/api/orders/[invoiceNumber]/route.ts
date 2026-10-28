import { apiOk, runApi } from '@/lib/http';
import { getOrderByInvoice } from '@/lib/repositories/orders';
import { notFound } from '@/lib/errors';
import type { PublicOrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ invoiceNumber: string }> };

/**
 * GET /api/orders/:invoiceNumber
 *
 * Status order untuk halaman hasil pembayaran (dipolling frontend karena
 * notifikasi DOKU datang asinkron). Sengaja hanya mengembalikan field publik —
 * tanpa email/telepon pelanggan dan tanpa URL pembayaran.
 */
export async function GET(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const { invoiceNumber } = await params;
    const order = await getOrderByInvoice(invoiceNumber.trim());

    if (!order) throw notFound('Order tidak ditemukan.');

    const payload: PublicOrderStatus = {
      invoiceNumber: order.invoiceNumber,
      planName: order.planName,
      amount: order.amount,
      status: order.status,
      channel: order.channel,
      paidAt: order.paidAt,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
    };

    return apiOk({ order: payload });
  });
}
