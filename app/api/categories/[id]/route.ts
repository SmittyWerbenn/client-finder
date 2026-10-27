import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { categoryInputSchema } from '@/lib/validation';
import { deleteCategory, getCategoryFor, updateCategory } from '@/lib/repositories/categories';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const category = await getCategoryFor(user, id);
    return apiOk({ category });
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = categoryInputSchema.parse(await req.json());
    const category = await updateCategory(user, id, input);
    return apiOk({ category });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    await deleteCategory(user, id);
    return apiOk({ deleted: true });
  });
}
