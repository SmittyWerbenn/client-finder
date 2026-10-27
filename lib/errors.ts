/**
 * Error terpusat untuk seluruh route handler. `status` dipetakan langsung ke
 * HTTP status; `code` dipakai frontend untuk membedakan jenis kegagalan.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message, details);
}

export function notFound(message = 'Data tidak ditemukan.'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, 'CONFLICT', message);
}

export function forbidden(message = 'Akses ditolak.'): HttpError {
  return new HttpError(403, 'FORBIDDEN', message);
}
