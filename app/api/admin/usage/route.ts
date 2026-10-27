import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { getUsageOverview } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';

/** Superadmin & Admin: metrik pemakaian Google Places API. */
export async function GET() {
  return runApi(async () => {
    await requireRole('SUPERADMIN', 'ADMIN');
    const overview = await getUsageOverview();
    return apiOk({ overview });
  });
}
