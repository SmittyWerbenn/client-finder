import { redirect } from 'next/navigation';
import UsagePanel from '@/components/UsagePanel';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { getUsageOverview } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';

export default async function ApiUsagePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.role)) redirect('/dashboard?denied=1');

  const overview = await getUsageOverview();
  return <UsagePanel initialOverview={overview} />;
}
