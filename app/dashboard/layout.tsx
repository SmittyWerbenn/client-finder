import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getSessionUser } from '@/lib/auth';
import { getUsageSnapshot } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const usage = await getUsageSnapshot(user.id, user.role);

  return (
    <AppShell user={user} usage={usage}>
      {children}
    </AppShell>
  );
}
