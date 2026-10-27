/**
 * Rate limiter in-memory sederhana (fixed window). Cukup untuk satu instance
 * Node; untuk multi-instance gunakan Redis/Upstash di depan route login.
 */

type Bucket = { count: number; resetAt: number };

const globalRef = globalThis as typeof globalThis & { __clientFinderRateBuckets?: Map<string, Bucket> };
const buckets = globalRef.__clientFinderRateBuckets ?? new Map<string, Bucket>();
globalRef.__clientFinderRateBuckets = buckets;

export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'local';
}
