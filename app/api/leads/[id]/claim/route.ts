import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { claimLead } from '@/lib/repositories/leads';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/leads/[id]/claim — kunci lead ke staf yang sedang menanganinya. */
export async function POST(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const lead = await claimLead(user, id);
    return apiOk({ lead });
  });
}
