import { isAdmin, requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { leadUpdateSchema } from '@/lib/validation';
import { deleteLead, getLead, updateLeadDetails, updateLeadStatus } from '@/lib/repositories/leads';
import { forbidden } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const lead = await getLead(user, id);
    return apiOk({ lead });
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = leadUpdateSchema.parse(await req.json());

    if (!isAdmin(user.role)) {
      if (!input.status || Object.keys(input).length !== 1) {
        throw forbidden('User hanya dapat memperbarui status pipeline lead miliknya.');
      }
      const lead = await updateLeadStatus(user, id, input.status);
      return apiOk({ lead });
    }

    const lead = await updateLeadDetails(user, id, input);
    return apiOk({ lead });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    await deleteLead(user, id);
    return apiOk({ deleted: true });
  });
}
