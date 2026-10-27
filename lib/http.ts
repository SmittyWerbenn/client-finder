import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './errors';

export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { ok: false as const, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

function zodDetails(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(body)',
    message: issue.message,
  }));
}

/**
 * Jalankan logika route dengan penanganan error terpusat. Dipakai di dalam
 * handler agar signature `(req, ctx)` tetap sesuai kontrak Next.js.
 */
export async function runApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      return apiError(error.status, error.code, error.message, error.details);
    }
    if (error instanceof ZodError) {
      return apiError(422, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', zodDetails(error));
    }
    if (error instanceof SyntaxError) {
      return apiError(400, 'INVALID_JSON', 'Body request tidak valid (harus JSON).');
    }
    console.error('[api] unhandled error', error);
    return apiError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan di server. Coba lagi beberapa saat.');
  }
}
