import { apiOk, runApi } from '@/lib/http';
import { dialect, getDatabase } from '@/lib/db';
import { currentPeriod } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Health check untuk load balancer / Docker healthcheck (tanpa data sensitif). */
export async function GET() {
  return runApi(async () => {
    const started = Date.now();
    const db = await getDatabase();
    await db.one('SELECT 1 AS value');
    return apiOk({
      status: 'ok',
      database: dialect(),
      period: currentPeriod(),
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  });
}
