import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { listOrders } from '@/lib/repositories/orders';
import { dokuConfig } from '@/lib/doku';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders — daftar order terbaru untuk Admin/Superadmin.
 * Berguna untuk rekonsiliasi manual selama notifikasi DOKU belum aktif.
 */
export async function GET() {
  return runApi(async () => {
    await requireRole('SUPERADMIN', 'ADMIN');
    const orders = await listOrders(100);
    const cfg = dokuConfig();

    const summary = orders.reduce(
      (acc, order) => {
        acc.total += 1;
        if (order.status === 'PAID') {
          acc.paid += 1;
          acc.revenue += order.amount;
        }
        if (order.status === 'PENDING') acc.pending += 1;
        return acc;
      },
      { total: 0, paid: 0, pending: 0, revenue: 0 },
    );

    return apiOk({
      orders,
      summary,
      doku: { configured: cfg.configured, production: cfg.isProduction },
    });
  });
}
