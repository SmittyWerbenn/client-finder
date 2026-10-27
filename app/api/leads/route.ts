import { requireRole, requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { leadCreateSchema, leadStatusSchema } from '@/lib/validation';
import { countLeadsByStatus, createManualLead, listLeads } from '@/lib/repositories/leads';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(80).optional(),
  ownerId: z.string().trim().min(1).optional(),
});

export async function GET(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const query = querySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      ownerId: url.searchParams.get('ownerId') ?? undefined,
    });
    const [leads, counts] = await Promise.all([
      listLeads(user, query),
      countLeadsByStatus(user),
    ]);
    return apiOk({ leads, counts });
  });
}

export async function POST(req: Request) {
  return runApi(async () => {
    const user = await requireRole('SUPERADMIN', 'ADMIN');
    const input = leadCreateSchema.parse(await req.json());
    const lead = await createManualLead(user, input);
    return apiOk({ lead }, 201);
  });
}
