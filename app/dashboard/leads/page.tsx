import { redirect } from 'next/navigation';
import LeadsManager from '@/components/LeadsManager';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { countLeadsByStatus, listLeads } from '@/lib/repositories/leads';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.role)) redirect('/dashboard?denied=1');

  const [leads, counts] = await Promise.all([listLeads(user, { limit: 500 }), countLeadsByStatus(user)]);
  return <LeadsManager initialLeads={leads} initialCounts={counts} />;
}
