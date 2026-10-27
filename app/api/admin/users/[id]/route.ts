import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { userUpdateSchema } from '@/lib/validation';
import { deleteUser, updateUser } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return runApi(async () => {
    const actor = await requireRole('SUPERADMIN');
    const { id } = await params;
    const input = userUpdateSchema.parse(await req.json());
    const user = await updateUser(actor.id, id, input);
    return apiOk({ user });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const actor = await requireRole('SUPERADMIN');
    const { id } = await params;
    await deleteUser(actor.id, id);
    return apiOk({ deleted: true });
  });
}
