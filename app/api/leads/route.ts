import { requireRole, requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { leadCreateSchema, leadStatusSchema } from '@/lib/validation';
import {
  countLeadsByStatus,
  createManualLead,
  deleteLeadsByFilter,
  listLeadCategories,
  listLeads,
} from '@/lib/repositories/leads';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(80).optional(),
  ownerId: z.string().trim().min(1).optional(),
  sector: z.string().trim().max(80).optional(),
  subCategory: z.string().trim().max(80).optional(),
});

function parseQuery(url: URL) {
  return querySchema.parse({
    status: url.searchParams.get('status') || undefined,
    q: url.searchParams.get('q') || undefined,
    ownerId: url.searchParams.get('ownerId') ?? undefined,
    sector: url.searchParams.get('sector') || undefined,
    subCategory: url.searchParams.get('subCategory') || undefined,
  });
}

export async function GET(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const query = parseQuery(new URL(req.url));
    const [leads, counts, categories] = await Promise.all([
      listLeads(user, query),
      countLeadsByStatus(user),
      listLeadCategories(user),
    ]);
    return apiOk({ leads, counts, categories });
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

/** DELETE /api/leads?sector=…&subCategory=…&status=…&q=… — hapus massal sesuai filter. */
export async function DELETE(req: Request) {
  return runApi(async () => {
    const user = await requireRole('SUPERADMIN', 'ADMIN');
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const input = querySchema.parse({
      status: body?.status ?? url.searchParams.get('status') ?? undefined,
      q: body?.q ?? url.searchParams.get('q') ?? undefined,
      ownerId: body?.ownerId ?? url.searchParams.get('ownerId') ?? undefined,
      sector: body?.sector ?? url.searchParams.get('sector') ?? undefined,
      subCategory: body?.subCategory ?? url.searchParams.get('subCategory') ?? undefined,
    });
    const deleted = await deleteLeadsByFilter(user, input);
    return apiOk({ deleted });
  });
}
