import { redirect } from 'next/navigation';
import CategoriesPanel from '@/components/CategoriesPanel';
import { getSessionUser } from '@/lib/auth';
import { DEMO_CATEGORIES, DEMO_USER, DEMO_USERS } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';
import { listCategoriesFor } from '@/lib/repositories/categories';
import { listUsers } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  if (await isDemoMode()) {
    return (
      <CategoriesPanel
        initialCategories={DEMO_CATEGORIES}
        users={DEMO_USERS}
        isSuperadmin
        currentUserId={DEMO_USER.id}
      />
    );
  }

  const user = await getSessionUser();
  if (!user) redirect('/console/login');

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
