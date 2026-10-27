import { redirect } from 'next/navigation';
import CategoriesPanel from '@/components/CategoriesPanel';
import { getSessionUser } from '@/lib/auth';
import { listCategoriesFor } from '@/lib/repositories/categories';
import { listUsers } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [categories, users] = await Promise.all([
    listCategoriesFor(user),
    user.role === 'SUPERADMIN' ? listUsers() : Promise.resolve([]),
  ]);

  return (
    <CategoriesPanel
      initialCategories={categories}
      users={users}
      isSuperadmin={user.role === 'SUPERADMIN'}
      currentUserId={user.id}
    />
  );
}
