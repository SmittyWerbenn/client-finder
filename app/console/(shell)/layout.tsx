import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getUsageSnapshot } from '@/lib/api-tracker';
import { getSessionUser } from '@/lib/auth';
import { DEMO_USAGE, DEMO_USER } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // Sesi nyata selalu menang atas cookie demo (mis. setelah login dari mode demo).
  const user = await getSessionUser();
  if (user) {
    const usage = await getUsageSnapshot(user.id, user.role);
    return (
      <AppShell user={user} usage={usage}>
        {children}
      </AppShell>
    );
  }

  if (await isDemoMode()) {
    return (
      <AppShell user={DEMO_USER} usage={DEMO_USAGE} demo>
        {children}
      </AppShell>
    );
  }

  redirect('/console/login');
}
