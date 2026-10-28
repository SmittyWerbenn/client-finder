import { redirect } from 'next/navigation';
import SearchWorkspace from '@/components/SearchWorkspace';
import { getUsageSnapshot } from '@/lib/api-tracker';
import { getSessionUser } from '@/lib/auth';
import { DEMO_CATEGORIES, DEMO_LEADS, DEMO_USAGE, DEMO_USER } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';
import { DEFAULT_TEMPLATES } from '@/lib/outreach';
import { listCategoriesFor } from '@/lib/repositories/categories';
import { listLeads } from '@/lib/repositories/leads';

export const dynamic = 'force-dynamic';

export default async function ConsoleHomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const demo = await isDemoMode();

  if (demo) {
    return (
      <SearchWorkspace
        user={DEMO_USER}
        initialCategories={DEMO_CATEGORIES}
        initialLeads={DEMO_LEADS}
        initialUsage={DEMO_USAGE}
        templates={DEFAULT_TEMPLATES}
        demo
      />
    );
  }

  const user = await getSessionUser();
  if (!user) redirect('/console/login');

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
