'use client';

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!payload) {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'Respons server tidak dapat dibaca.');
  }
  if (!response.ok || !payload.ok) {
    const error = payload.ok ? null : payload.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Permintaan gagal.',
      error?.details,
    );
  }
  return payload.data;
}
