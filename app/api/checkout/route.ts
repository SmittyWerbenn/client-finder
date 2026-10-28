import { HttpError } from '@/lib/errors';
import { apiOk, runApi } from '@/lib/http';
import { getSessionUser } from '@/lib/auth';
import { createCheckoutPayment } from '@/lib/doku';
import { findPaidPlan } from '@/lib/plans';
import { attachDokuPayment, createOrder, markOrderFailed } from '@/lib/repositories/orders';
import { contactHref } from '@/lib/site';
import { clientIp, consumeRateLimit } from '@/lib/rate-limit';
import { checkoutSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/checkout
 *
 * Membuat order di database lalu sesi pembayaran DOKU Checkout. Respons
 * berisi `paymentUrl` yang langsung dipakai frontend untuk redirect ke halaman
 * pembayaran DOKU.
 *
 * Bila kredensial DOKU belum diisi (DOKU_CLIENT_ID / DOKU_SECRET_KEY kosong),
 * route membalas 503 `DOKU_NOT_CONFIGURED` beserta nomor invoice dan tautan
 * WhatsApp admin supaya pengunjung tetap bisa menyelesaikan order manual.
 */
export async function POST(req: Request) {
  return runApi(async () => {
    // Maksimal 10 percobaan checkout per 10 menit per IP → cegah spam order.
    if (!consumeRateLimit(`checkout:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
      throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan pembayaran. Coba lagi beberapa menit lagi.');
    }

    const input = checkoutSchema.parse(await req.json());
    const plan = findPaidPlan(input.planId);
    if (!plan) {
      throw new HttpError(422, 'UNKNOWN_PLAN', 'Paket yang dipilih tidak tersedia.');
    }

    const session = await getSessionUser();

    const order = await createOrder({
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      customerName: input.name,
      customerEmail: input.email,
      customerPhone: input.phone,
      company: input.company,
      userId: session?.id ?? null,
    });

    const adminFallback = contactHref(
      `Halo Admin, saya ingin membeli paket ${plan.name} (${plan.priceLabel}). Nomor invoice saya ${order.invoiceNumber}. Mohon dibantu prosesnya.`,
    );

    try {
      const payment = await createCheckoutPayment({
        invoiceNumber: order.invoiceNumber,
        amount: plan.amount,
        planName: plan.name,
        planDescription: plan.quota,
        customer: {
          name: input.name,
          email: input.email,
          phone: input.phone.replace(/\D/g, ''),
        },
      });

      await attachDokuPayment(order.invoiceNumber, {
        paymentUrl: payment.paymentUrl,
        tokenId: payment.tokenId,
        requestId: payment.requestId,
      });

      return apiOk({
        invoiceNumber: order.invoiceNumber,
        paymentUrl: payment.paymentUrl,
        expiredDate: payment.expiredDate,
        plan: { id: plan.id, name: plan.name, amount: plan.amount, priceLabel: plan.priceLabel },
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === 'DOKU_NOT_CONFIGURED') {
        // Order tetap tersimpan (PENDING) agar admin bisa menindaklanjuti manual.
        throw new HttpError(error.status, error.code, error.message, {
          invoiceNumber: order.invoiceNumber,
          plan: { id: plan.id, name: plan.name, amount: plan.amount, priceLabel: plan.priceLabel },
          adminWhatsappUrl: adminFallback,
        });
      }

      const message = error instanceof HttpError ? error.message : 'Pembayaran gagal dibuat.';
      await markOrderFailed(
        order.invoiceNumber,
        JSON.stringify({ error: message, at: new Date().toISOString() }),
      );
      throw error;
    }
  });
}
