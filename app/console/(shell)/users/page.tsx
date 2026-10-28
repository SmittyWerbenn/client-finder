import { redirect } from 'next/navigation';
import UsersPanel from '@/components/UsersPanel';
import { getSessionUser } from '@/lib/auth';
import { DEMO_USER, DEMO_USERS } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';
import { listUsers } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  if (await isDemoMode()) {
    return <UsersPanel initialUsers={DEMO_USERS} currentUserId={DEMO_USER.id} />;
  }

  const user = await getSessionUser();
  if (!user) redirect('/console/login');
  if (user.role !== 'SUPERADMIN') redirect('/console?denied=1');

  const users = await listUsers();
  return <UsersPanel initialUsers={users} currentUserId={user.id} />;
}
