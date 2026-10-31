import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { releaseLead } from '@/lib/repositories/leads';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/leads/[id]/release — lepas claim supaya staf lain bisa menangani. */
export async function POST(_req: Request, { params }: Ctx) {
  return runApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const lead = await releaseLead(user, id);
    return apiOk({ lead });
  });
}
