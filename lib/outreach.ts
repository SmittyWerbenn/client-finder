import templatesSeed from '@/data/templates.json';
import { normalizePhone } from './phone';
import type { LeadStatus, Prospect } from './types';

/** Utilitas outreach: template WhatsApp, deep link wa.me, LinkedIn X-Ray. */

export type WaTemplate = {
  id: string;
  name: string;
  body: string;
};

export type ProspectFilters = {
  phoneOnly: boolean;
  minRating: number;
  minReviews: number;
};

export const DEFAULT_FILTERS: ProspectFilters = { phoneOnly: false, minRating: 0, minReviews: 0 };

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

export function waLink(lead: Prospect, body: string, city: string): string | null {
  const phone = normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw);
  if (!phone) return null;
  const message = fillTemplate(body, templateContextFor(lead, city));
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function linkedInXrayUrl(businessName: string, city: string): string {
  const query = `site:linkedin.com/in ("${businessName}" OR "${city}") ("Owner" OR "Founder" OR "Manager")`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function matchesFilters(lead: Prospect, filters: ProspectFilters): boolean {
  if (lead.website) return false;
  if (filters.phoneOnly && !normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)) return false;
  if (filters.minRating > 0 && (lead.rating ?? 0) < filters.minRating) return false;
  if (filters.minReviews > 0 && lead.reviews < filters.minReviews) return false;
  return true;
}
