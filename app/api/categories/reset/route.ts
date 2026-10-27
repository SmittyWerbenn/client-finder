import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { listCategoriesFor, restoreGlobalCategories } from '@/lib/repositories/categories';

export const dynamic = 'force-dynamic';

/** Superadmin: pulihkan katalog kategori global yang hilang. */
export async function POST() {
  return runApi(async () => {
    const user = await requireRole('SUPERADMIN');
    await restoreGlobalCategories();
    const categories = await listCategoriesFor(user);
    return apiOk({ categories });
  });
}
