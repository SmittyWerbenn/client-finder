import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { getLeadsByIds, listLeads } from '@/lib/repositories/leads';
import { leadStatusSchema } from '@/lib/validation';
import { bytesToBase64, buildLeadsXlsx, xlsxFileName } from '@/lib/xlsx';

export const dynamic = 'force-dynamic';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const exportSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, 'Tidak ada prospek untuk diexport.').max(1000),
  city: z.string().trim().max(80).optional(),
});

/** POST /api/export — workbook .xlsx asli, dikirim sebagai base64 agar bisa diunduh dari client. */
export async function POST(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const input = exportSchema.parse(await req.json());
    const leads = await getLeadsByIds(user, input.ids);

    if (leads.length === 0) {
      return apiOk({ fileBase64: '', fileName: '', mime: XLSX_MIME });
    }

    const bytes = buildLeadsXlsx(leads);
    const fileName = xlsxFileName(leads[0]?.sector, input.city ?? leads[0]?.city);

    return apiOk({ fileBase64: bytesToBase64(bytes), fileName, mime: XLSX_MIME });
  });
}

const querySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(['recent', 'stale']).optional(),
});

/** GET /api/export?status=… — unduh langsung (dipakai halaman Database Leads). */
export async function GET(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const query = querySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    });
    const leads = await listLeads(user, { ...query, limit: 1000 });
    const bytes = buildLeadsXlsx(leads);
    const fileName = xlsxFileName(leads[0]?.sector, leads[0]?.city);

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
