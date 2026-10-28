import { requireUser } from '@/lib/auth';
import { apiOk, runApi } from '@/lib/http';
import { searchSchema } from '@/lib/validation';
import { getCategoryFor } from '@/lib/repositories/categories';
import { searchProspects, type SearchCategoryInput } from '@/lib/places';
import { saveSearchLeads } from '@/lib/repositories/leads';
import { assertQuota, getUsageSnapshot } from '@/lib/api-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const runtime = 'nodejs';

const DIRECT_PITCH =
  'Peluang kemitraan & suplai: tawarkan produk atau jasa pendukung, cross-promo, atau kerja sama operasional dengan bisnis ini.';

/**
 * POST /api/search
 * Pipeline: auth → validasi → cek kuota → Google Places → filter status
 * website (opsional: all / no_website / has_website) → normalisasi WhatsApp →
 * simpan lead (scoped user) → payload bersih.
 */
export async function POST(req: Request) {
  return runApi(async () => {
    const user = await requireUser();
    const input = searchSchema.parse(await req.json());

    let category: SearchCategoryInput;
    if (input.mode === 'name') {
      const name = (input.name ?? '').trim();
      category = {
        sector: 'Pencarian Langsung',
        subCategory: name,
        keyword: name,
        pitch: DIRECT_PITCH,
      };
    } else {
      const stored = await getCategoryFor(user, input.categoryId ?? '');
      category = {
        sector: stored.sector,
        subCategory: stored.subCategory,
        keyword: stored.keyword,
        pitch: stored.pitch,
      };
    }

    await assertQuota(user.id, user.role);

    const { prospects, meta } = await searchProspects({
      userId: user.id,
      category,
      city: input.city,
      websiteFilter: input.websiteFilter,
    });

    const leads = await saveSearchLeads(user.id, meta.city, prospects);
    const usage = await getUsageSnapshot(user.id, user.role);

    return apiOk({ leads, meta, usage });
  });
}
