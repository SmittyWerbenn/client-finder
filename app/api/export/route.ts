import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { getLeadsByIds, listLeads } from '@/lib/repositories/leads';
import { leadStatusSchema } from '@/lib/validation';
import { buildProspectCsv, csvFileName } from '@/lib/csv';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, 'Tidak ada prospek untuk diexport.').max(1000),
  city: z.string().trim().max(80).optional(),
});

/** POST /api/export — CSV dibuat server-side dari id lead sesuai scope role. */
export async function POST(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const input = exportSchema.parse(await req.json());
    const leads = await getLeadsByIds(user, input.ids);

    if (leads.length === 0) {
      return apiOk({ csv: '', fileName: '' });
    }

    const statuses = Object.fromEntries(leads.map((lead) => [lead.placeId, lead.status]));
    const csv = buildProspectCsv(leads, statuses);
    const fileName = csvFileName(leads[0]?.sector, input.city ?? leads[0]?.city);

    return apiOk({ csv, fileName });
  });
}

const querySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(80).optional(),
});

/** GET /api/export?status=… — unduh langsung (dipakai halaman Leads). */
export async function GET(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const query = querySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
    });
    const leads = await listLeads(user, { ...query, limit: 1000 });
    const statuses = Object.fromEntries(leads.map((lead) => [lead.placeId, lead.status]));
    const csv = buildProspectCsv(leads, statuses);
    const fileName = csvFileName(leads[0]?.sector, leads[0]?.city);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
