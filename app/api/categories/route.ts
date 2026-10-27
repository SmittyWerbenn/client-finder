import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { categoryInputSchema } from '@/lib/validation';
import { createCategory, listCategoriesFor } from '@/lib/repositories/categories';
import { getUsageSnapshot } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  return runApi(async () => {
    const user = await requireUser();
    const [categories, usage] = await Promise.all([
      listCategoriesFor(user),
      getUsageSnapshot(user.id, user.role),
    ]);
    return apiOk({ categories, usage });
  });
}

export async function POST(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const input = categoryInputSchema.parse(await req.json());
    const category = await createCategory(user, input);
    return apiOk({ category }, 201);
  });
}
