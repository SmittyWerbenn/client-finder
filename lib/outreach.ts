import templatesSeed from '@/data/templates.json';
import { normalizePhone } from './phone';
import type { LeadStatus, Prospect, WebsiteFilter } from './types';

/** Utilitas outreach: template WhatsApp, deep link wa.me, LinkedIn X-Ray. */

export type WaTemplate = {
  id: string;
  name: string;
  body: string;
  /** Kelompok preset di modal broadcast (mis. Gatekeeper). */
  category?: string;
};

export type ProspectFilters = {
  phoneOnly: boolean;
  minRating: number;
  minReviews: number;
  websiteFilter: WebsiteFilter;
};

export const DEFAULT_FILTERS: ProspectFilters = {
  phoneOnly: false,
  minRating: 0,
  minReviews: 0,
  websiteFilter: 'all',
};

export const WEBSITE_FILTER_OPTIONS: { value: WebsiteFilter; label: string; short: string }[] = [
  {
    value: 'all',
    label: 'Semua Bisnis (Rekomendasi Kerja Sama, Supplier & Kemitraan)',
    short: 'Semua bisnis',
  },
  {
    value: 'no_website',
    label: 'Khusus Tanpa Website (Untuk Penawaran Jasa Pembuatan Web & IT)',
    short: 'Tanpa website',
  },
  {
    value: 'has_website',
    label: 'Khusus yang Sudah Memiliki Website',
    short: 'Sudah punya website',
  },
];

export function websiteFilterLabel(filter: WebsiteFilter): string {
  return WEBSITE_FILTER_OPTIONS.find((option) => option.value === filter)?.short ?? 'Semua bisnis';
}

/** Pitch angle netral untuk bisnis yang sudah online (partnership / suplai). */
export function partnershipPitch(subCategory: string, city: string): string {
  const scope = subCategory.toLowerCase();
  return `Peluang kemitraan & suplai untuk ${scope} di ${city}: tawarkan produk atau jasa pendukung, cross-promo, atau kerja sama operasional.`;
}

export const LEAD_STATUSES: { value: LeadStatus; label: string; hint: string }[] = [
  { value: 'New', label: 'New', hint: 'Baru masuk daftar prospek' },
  { value: 'Contacted', label: 'Contacted', hint: 'Sudah dikirim pesan WhatsApp' },
  { value: 'Interested', label: 'Interested', hint: 'Sudah membalas / minta penawaran' },
  { value: 'Closed', label: 'Closed', hint: 'Deal atau ditutup' },
];

export const DEFAULT_TEMPLATES = templatesSeed as WaTemplate[];

export const CATALOG_URL = process.env.NEXT_PUBLIC_CATALOG_URL?.trim() || 'https://client-finder.frel.cloud/katalog';

export function normalizeWaPhone(phone: string | null | undefined): string | null {
  return normalizePhone(phone)?.wa ?? null;
}

export type TemplateContext = {
  businessName: string;
  city: string;
  pitchAngle: string;
  catalogUrl: string;
};

export function templateContextFor(lead: Prospect, city: string): TemplateContext {
  return {
    businessName: lead.name,
    city: city || lead.city || '',
    pitchAngle: lead.pitch,
    catalogUrl: CATALOG_URL,
  };
}

export function fillTemplate(body: string, ctx: TemplateContext): string {
  return body
    .replaceAll('{{business_name}}', ctx.businessName)
    .replaceAll('{{city}}', ctx.city)
    .replaceAll('{{pitch_angle}}', ctx.pitchAngle)
    .replaceAll('{{catalog_url}}', ctx.catalogUrl);
}

/**
 * Parser spintax `{Halo|Selamat Siang|Hai}` → satu varian acak.
 * Hanya grup yang punya pemisah `|` yang diproses, sehingga placeholder
 * `{{business_name}}` tidak ikut terpotong.
 */
export function spinText(input: string, random: () => number = Math.random): string {
  return input.replace(/\{([^{}]*\|[^{}]*)\}/g, (_match, group: string) => {
    const options = group.split('|').map((option) => option.trim()).filter(Boolean);
    if (options.length === 0) return '';
    return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  });
}

/** Isi placeholder lalu acak spintax — dipakai per penerima agar tiap chat unik. */
export function renderTemplate(body: string, ctx: TemplateContext, random: () => number = Math.random): string {
  return spinText(fillTemplate(body, ctx), random);
}

export function waLink(lead: Prospect, body: string, city: string): string | null {
  const phone = normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw);
  if (!phone) return null;
  const message = renderTemplate(body, templateContextFor(lead, city));
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function linkedInXrayUrl(businessName: string, city: string): string {
  const query = `site:linkedin.com/in ("${businessName}" OR "${city}") ("Owner" OR "Founder" OR "Manager")`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function matchesFilters(lead: Prospect, filters: ProspectFilters): boolean {
  if (filters.websiteFilter === 'no_website' && lead.website) return false;
  if (filters.websiteFilter === 'has_website' && !lead.website) return false;
  if (filters.phoneOnly && !normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)) return false;
  if (filters.minRating > 0 && (lead.rating ?? 0) < filters.minRating) return false;
  if (filters.minReviews > 0 && lead.reviews < filters.minReviews) return false;
  return true;
}
