import { requireRole } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { userCreateSchema } from '@/lib/validation';
import { createUser, listUsers } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  return runApi(async () => {
    await requireRole('SUPERADMIN');
    const users = await listUsers();
    return apiOk({ users });
  });
}

export async function POST(req: Request) {
  return runApi(async () => {
    await requireRole('SUPERADMIN');
    const input = userCreateSchema.parse(await req.json());
    const user = await createUser(input);
    return apiOk({ user }, 201);
  });
}
