import { redirect } from 'next/navigation';
import SearchWorkspace from '@/components/SearchWorkspace';
import { getSessionUser } from '@/lib/auth';
import { listCategoriesFor } from '@/lib/repositories/categories';
import { listLeads } from '@/lib/repositories/leads';
import { getUsageSnapshot } from '@/lib/api-tracker';
import { DEFAULT_TEMPLATES } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [categories, leads, usage] = await Promise.all([
    listCategoriesFor(user),
    listLeads(user, { limit: 200 }),
    getUsageSnapshot(user.id, user.role),
  ]);

  return (
    <SearchWorkspace
      user={user}
      initialCategories={categories}
      initialLeads={leads}
      initialUsage={usage}
      templates={DEFAULT_TEMPLATES}
      denied={(await searchParams).denied === '1'}
    />
  );
}
