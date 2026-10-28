import { redirect } from 'next/navigation';
import LeadsManager from '@/components/LeadsManager';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { DEMO_LEADS, demoLeadCounts, demoLeadFacets } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';
import { countLeadsByStatus, listLeadCategories, listLeads } from '@/lib/repositories/leads';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  if (await isDemoMode()) {
    return (
      <LeadsManager
        initialLeads={DEMO_LEADS}
        initialCounts={demoLeadCounts()}
        initialCategories={demoLeadFacets()}
      />
    );
  }

  const user = await getSessionUser();
  if (!user) redirect('/console/login');
  if (!isAdmin(user.role)) redirect('/console?denied=1');

  const [leads, counts, categories] = await Promise.all([
    listLeads(user, { limit: 500 }),
    countLeadsByStatus(user),
    listLeadCategories(user),
  ]);
  return <LeadsManager initialLeads={leads} initialCounts={counts} initialCategories={categories} />;
}
