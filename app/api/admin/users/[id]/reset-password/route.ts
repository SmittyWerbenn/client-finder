import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { resetPasswordSchema } from '@/lib/validation';
import { resetUserPassword } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return runApi(async () => {
    await requireRole('SUPERADMIN');
    const { id } = await params;
    const input = resetPasswordSchema.parse(await req.json());
    await resetUserPassword(id, input.password);
    return apiOk({ reset: true });
  });
}
