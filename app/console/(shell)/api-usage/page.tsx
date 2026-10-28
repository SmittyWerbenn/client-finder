import { redirect } from 'next/navigation';
import UsagePanel from '@/components/UsagePanel';
import { getUsageOverview } from '@/lib/api-tracker';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { DEMO_OVERVIEW } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function ApiUsagePage() {
  if (await isDemoMode()) {
    return <UsagePanel initialOverview={DEMO_OVERVIEW} />;
  }

  const user = await getSessionUser();
  if (!user) redirect('/console/login');
  if (!isAdmin(user.role)) redirect('/console?denied=1');

  const overview = await getUsageOverview();
  return <UsagePanel initialOverview={overview} />;
}
