import { redirect } from 'next/navigation';
import UsersPanel from '@/components/UsersPanel';
import { getSessionUser } from '@/lib/auth';
import { listUsers } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'SUPERADMIN') redirect('/dashboard?denied=1');

  const users = await listUsers();
  return <UsersPanel initialUsers={users} currentUserId={user.id} />;
}
