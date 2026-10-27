import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { getUsageSnapshot } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  return runApi(async () => {
    const user = await requireUser();
    const usage = await getUsageSnapshot(user.id, user.role);
    return apiOk({ user, usage });
  });
}
