import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors';

/**
 * Integrasi DOKU Checkout (non-SNAP) — hanya dipanggil dari server.
 *
 * Alur:
 *  1. `createCheckoutPayment()` POST ke /checkout/v1/payment dengan header
 *     Client-Id, Request-Id, Request-Timestamp, Signature dan Digest.
 *  2. DOKU membalas `response.payment.url` → pelanggan diarahkan ke halaman
 *     pembayaran DOKU (hosted checkout).
 *  3. Setelah pembayaran, DOKU mengirim HTTP Notification ke
 *     `/api/doku/notification`; signature request diverifikasi di route itu
 *     dengan `verifyNotificationSignature()`.
 *
 * Signature non-SNAP (docs: developers.doku.com → Signature Component from
 * Request Header):
 *
 *   Client-Id:<id>\nRequest-Id:<uuid>\nRequest-Timestamp:<ISO8601Z>\n
 *   Request-Target:<path>\nDigest:<base64(sha256(body))>
 *
 * di-HMAC-SHA256 dengan Secret Key, lalu diberi prefix `HMACSHA256=`.
 */

export const DOKU_NOTIFICATION_PATH = '/api/doku/notification';
export const DOKU_PAYMENT_PATH = '/checkout/v1/payment';

/**
 * DOKU_CHECKOUT_URL_PROD/SANDBOX boleh berisi base URL (`https://api.doku.com`)
 * atau endpoint penuh (`https://api.doku.com/checkout/v1/payment`) — jangan
 * sampai path-nya dobel, karena DOKU akan membalas 404.
 */
function checkoutEndpoint(baseUrl: string): string {
  return baseUrl.endsWith(DOKU_PAYMENT_PATH) ? baseUrl : `${baseUrl}${DOKU_PAYMENT_PATH}`;
}

export type DokuConfig = {
  clientId: string;
  secretKey: string;
  isProduction: boolean;
  baseUrl: string;
  appUrl: string;
  /** true bila Client-Id & Secret Key terisi (bukan placeholder). */
  configured: boolean;
};

function env(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isPlaceholder(value: string): boolean {
  return value === '' || /^(your_|isi_|xxx|changeme)/i.test(value);
}

export function dokuConfig(): DokuConfig {
  const clientId = env(process.env.DOKU_CLIENT_ID);
  const secretKey = env(process.env.DOKU_SECRET_KEY);
  const isProduction = env(process.env.DOKU_IS_PRODUCTION).toLowerCase() !== 'false';

  const sandboxUrl =
    env(process.env.DOKU_CHECKOUT_URL_SANDBOX) || 'https://api-sandbox.doku.com/checkout/v1/payment';
  const productionUrl =
    env(process.env.DOKU_CHECKOUT_URL_PROD) || 'https://api.doku.com/checkout/v1/payment';

  const appUrl =
    env(process.env.NEXT_PUBLIC_APP_URL) || env(process.env.NEXTAUTH_URL) || 'https://client-finder.frel.cloud';

  return {
    clientId,
    secretKey,
    isProduction,
    baseUrl: (isProduction ? productionUrl : sandboxUrl).replace(/\/+$/, ''),
    appUrl: appUrl.replace(/\/+$/, ''),
    configured: !isPlaceholder(clientId) && !isPlaceholder(secretKey),
  };
}

/** Timestamp wajib ISO8601 UTC tanpa milidetik, contoh: 2020-08-11T08:45:42Z */
export function dokuTimestamp(date = new Date()): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

export function digestOf(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('base64');
}

export type SignatureParts = {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest: string;
  secretKey: string;
};

export function dokuSignature(parts: SignatureParts): string {
  const component = [
    `Client-Id:${parts.clientId}`,
    `Request-Id:${parts.requestId}`,
    `Request-Timestamp:${parts.requestTimestamp}`,
    `Request-Target:${parts.requestTarget}`,
    `Digest:${parts.digest}`,
  ].join('\n');

  const hmac = createHmac('sha256', parts.secretKey).update(component, 'utf8').digest('base64');
  return `HMACSHA256=${hmac}`;
}

/** Perbandingan waktu-konstan untuk mencegah timing attack pada signature. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verifikasi HTTP Notification dari DOKU. `rawBody` harus body mentah
 * (string) — jangan di-parse lalu di-stringify ulang karena Digest dihitung
 * dari byte yang dikirim DOKU.
 */
export function verifyNotificationSignature(headers: Headers, rawBody: string): boolean {
  const cfg = dokuConfig();
  if (!cfg.configured) return false;

  const signature = headers.get('signature') ?? '';
  const requestId = headers.get('request-id') ?? '';
  const requestTimestamp = headers.get('request-timestamp') ?? '';
  const clientId = headers.get('client-id') ?? cfg.clientId;

  if (!signature || !requestId || !requestTimestamp) return false;

  const expected = dokuSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget: DOKU_NOTIFICATION_PATH,
    digest: digestOf(rawBody),
    secretKey: cfg.secretKey,
  });

  return safeEqual(signature.trim(), expected);
}

export type DokuCustomer = {
  name: string;
  email: string;
  phone?: string;
};

export type DokuCheckoutInput = {
  invoiceNumber: string;
  amount: number;
  planName: string;
  planDescription: string;
  customer: DokuCustomer;
};

export type DokuCheckoutResult = {
  paymentUrl: string;
  tokenId: string | null;
  expiredDate: string | null;
  requestId: string;
};

type DokuPaymentResponse = {
  message?: string[];
  response?: {
    order?: { amount?: number | string; invoice_number?: string };
    payment?: { token_id?: string; url?: string; expired_date?: string };
  };
  error_messages?: string[];
};

/**
 * Buat sesi pembayaran DOKU. Melempar HttpError 503 bila kredensial belum
 * diisi (mode "belum ada API key"), 502 bila DOKU menolak/gagal dihubungi.
 */
export async function createCheckoutPayment(input: DokuCheckoutInput): Promise<DokuCheckoutResult> {
  const cfg = dokuConfig();

  if (!cfg.configured) {
    throw new HttpError(
      503,
      'DOKU_NOT_CONFIGURED',
      'Pembayaran online belum aktif karena kredensial DOKU belum diisi di server. Silakan hubungi admin.',
      { invoiceNumber: input.invoiceNumber, plan: input.planName },
    );
  }

  const requestId = randomUUID();
  const requestTimestamp = dokuTimestamp();

  const body = {
    order: {
      amount: input.amount,
      invoice_number: input.invoiceNumber,
      currency: 'IDR',
      callback_url: `${cfg.appUrl}/checkout/status`,
      callback_url_result: `${cfg.appUrl}/checkout/status`,
      language: 'ID',
      auto_redirect: true,
      line_items: [
        {
          id: input.invoiceNumber,
          name: input.planName,
          quantity: 1,
          price: input.amount,
          sku: input.invoiceNumber,
          category: 'digital-content',
          url: `${cfg.appUrl}/#harga`,
        },
      ],
    },
    payment: {
      payment_due_date: 60,
      type: 'SALE',
    },
    customer: {
      id: input.customer.email,
      name: input.customer.name,
      email: input.customer.email,
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
      country: 'ID',
    },
    additional_info: {
      override_notification_url: `${cfg.appUrl}${DOKU_NOTIFICATION_PATH}`,
    },
  };

  const rawBody = JSON.stringify(body);
  const signature = dokuSignature({
    clientId: cfg.clientId,
    requestId,
    requestTimestamp,
    requestTarget: DOKU_PAYMENT_PATH,
    digest: digestOf(rawBody),
    secretKey: cfg.secretKey,
  });

  let response: Response;
  try {
    response = await fetch(checkoutEndpoint(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': cfg.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        Signature: signature,
      },
      body: rawBody,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new HttpError(
      502,
      'DOKU_UNREACHABLE',
      'Gagal menghubungi DOKU. Coba lagi beberapa saat atau hubungi admin.',
      { invoiceNumber: input.invoiceNumber },
    );
  }

  const text = await response.text();
  let payload: DokuPaymentResponse = {};
  try {
    payload = JSON.parse(text) as DokuPaymentResponse;
  } catch {
    payload = { error_messages: [text.slice(0, 300)] };
  }

  if (!response.ok) {
    const message =
      payload.error_messages?.join('; ') ||
      payload.message?.join('; ') ||
      `DOKU membalas HTTP ${response.status}`;
    throw new HttpError(502, 'DOKU_ERROR', `Pembayaran gagal dibuat: ${message}`, {
      invoiceNumber: input.invoiceNumber,
      httpStatus: response.status,
    });
  }

  const url = payload.response?.payment?.url?.trim();
  if (!url) {
    throw new HttpError(502, 'DOKU_INVALID_RESPONSE', 'DOKU tidak mengembalikan URL pembayaran.', {
      invoiceNumber: input.invoiceNumber,
      httpStatus: response.status,
    });
  }

  return {
    paymentUrl: url,
    tokenId: payload.response?.payment?.token_id ?? null,
    expiredDate: payload.response?.payment?.expired_date ?? null,
    requestId,
  };
}
