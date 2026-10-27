import accountsSeed from '@/data/users.json';
import templatesSeed from '@/data/templates.json';
import type { Prospect } from './types';

/* ────────────────────────── tipe prototype ────────────────────────── */

export type Plan = 'Free' | 'Pro';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: Plan;
  credits: number;
  monthlyCredits: number;
  initials: string;
};

export type WaTemplate = {
  id: string;
  name: string;
  body: string;
};

export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Closed';

export const LEAD_STATUSES: { value: LeadStatus; label: string; hint: string }[] = [
  { value: 'New', label: 'New', hint: 'Baru masuk daftar prospek' },
  { value: 'Contacted', label: 'Contacted', hint: 'Sudah dikirim pesan WhatsApp' },
  { value: 'Interested', label: 'Interested', hint: 'Sudah membalas / minta penawaran' },
  { value: 'Closed', label: 'Closed', hint: 'Deal atau ditutup' },
];

export type LeadFilters = {
  phoneOnly: boolean;
  minRating: number;
  minReviews: number;
};

export const DEFAULT_FILTERS: LeadFilters = { phoneOnly: false, minRating: 0, minReviews: 0 };

export type AccountState = { plan: Plan; credits: number };

export type PrototypeState = {
  activeUserId: string;
  accounts: Record<string, AccountState>;
  statuses: Record<string, LeadStatus>;
  templates: WaTemplate[];
};

export const DEMO_ACCOUNTS = accountsSeed as DemoUser[];
export const DEFAULT_TEMPLATES = templatesSeed as WaTemplate[];

const STORAGE_KEY = 'clientfinder:prototype:v1';

/* ────────────────────────── persistence ────────────────────────── */

function defaultState(): PrototypeState {
  const accounts: Record<string, AccountState> = {};
  for (const user of DEMO_ACCOUNTS) {
    accounts[user.id] = { plan: user.plan, credits: user.credits };
  }
  return {
    activeUserId: DEMO_ACCOUNTS[0]?.id ?? 'u-free',
    accounts,
    statuses: {},
    templates: DEFAULT_TEMPLATES.map((tpl) => ({ ...tpl })),
  };
}

export function loadPrototypeState(): PrototypeState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PrototypeState>;
    const base = defaultState();
    const accounts: Record<string, AccountState> = { ...base.accounts };
    for (const [id, value] of Object.entries(parsed.accounts ?? {})) {
      if (!accounts[id] || !value) continue;
      accounts[id] = {
        plan: value.plan === 'Pro' ? 'Pro' : 'Free',
        credits: Number.isFinite(value.credits) ? Math.max(0, Math.round(value.credits)) : accounts[id].credits,
      };
    }
    const templates = Array.isArray(parsed.templates) && parsed.templates.length > 0
      ? parsed.templates
          .filter((tpl): tpl is WaTemplate => Boolean(tpl && typeof tpl.id === 'string' && typeof tpl.name === 'string' && typeof tpl.body === 'string'))
          .map((tpl) => ({ id: tpl.id, name: tpl.name, body: tpl.body }))
      : base.templates;

    return {
      activeUserId: accounts[parsed.activeUserId ?? ''] ? (parsed.activeUserId as string) : base.activeUserId,
      accounts,
      statuses: normalizeStatuses(parsed.statuses),
      templates: templates.length > 0 ? templates : base.templates,
    };
  } catch {
    return defaultState();
  }
}

export function savePrototypeState(state: PrototypeState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — abaikan, state tetap hidup di memori */
  }
}

export function resetPrototypeState(): PrototypeState {
  const fresh = defaultState();
  savePrototypeState(fresh);
  return fresh;
}

function normalizeStatuses(input: unknown): Record<string, LeadStatus> {
  if (!input || typeof input !== 'object') return {};
  const valid = new Set(LEAD_STATUSES.map((status) => status.value));
  const result: Record<string, LeadStatus> = {};
  for (const [placeId, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string' && valid.has(value as LeadStatus)) {
      result[placeId] = value as LeadStatus;
    }
  }
  return result;
}

/* ────────────────────────── kredit & akun ────────────────────────── */

export function activeUser(state: PrototypeState): DemoUser {
  return DEMO_ACCOUNTS.find((user) => user.id === state.activeUserId) ?? DEMO_ACCOUNTS[0];
}

export function activeAccount(state: PrototypeState): AccountState {
  const user = activeUser(state);
  return state.accounts[user.id] ?? { plan: user.plan, credits: user.credits };
}

/** Potong 1 kredit. `null` = kuota habis. */
export function spendCredit(state: PrototypeState): PrototypeState | null {
  const user = activeUser(state);
  const account = state.accounts[user.id];
  if (!account || account.credits <= 0) return null;
  return {
    ...state,
    accounts: { ...state.accounts, [user.id]: { ...account, credits: account.credits - 1 } },
  };
}

export function refundCredit(state: PrototypeState): PrototypeState {
  const user = activeUser(state);
  const account = state.accounts[user.id];
  if (!account) return state;
  const cap = DEMO_ACCOUNTS.find((entry) => entry.id === user.id)?.monthlyCredits ?? account.credits;
  return {
    ...state,
    accounts: { ...state.accounts, [user.id]: { ...account, credits: Math.min(cap, account.credits + 1) } },
  };
}

/** Simulasi upgrade ke Pro: paket berubah + kuota diisi ulang. */
export function upgradeToPro(state: PrototypeState): PrototypeState {
  const user = activeUser(state);
  const cap = DEMO_ACCOUNTS.find((entry) => entry.id === user.id)?.monthlyCredits ?? 500;
  return {
    ...state,
    accounts: { ...state.accounts, [user.id]: { plan: 'Pro', credits: Math.max(cap, 500) } },
  };
}

/* ────────────────────────── template WhatsApp ────────────────────────── */

export type TemplateContext = {
  businessName: string;
  city: string;
  pitchAngle: string;
  catalogUrl: string;
};

export const CATALOG_URL = 'https://client-finder.frel.cloud/katalog';

export function fillTemplate(body: string, ctx: TemplateContext): string {
  return body
    .replaceAll('{{business_name}}', ctx.businessName)
    .replaceAll('{{city}}', ctx.city)
    .replaceAll('{{pitch_angle}}', ctx.pitchAngle)
    .replaceAll('{{catalog_url}}', ctx.catalogUrl);
}

export function normalizeWaPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (digits.startsWith('62') && digits.length >= 10) return digits;
  return null;
}

export function templateContextFor(lead: Prospect, city: string): TemplateContext {
  return {
    businessName: lead.name,
    city: city || 'Jakarta Selatan',
    pitchAngle: lead.pitch,
    catalogUrl: CATALOG_URL,
  };
}

export function waLink(lead: Prospect, body: string, city: string): string | null {
  const phone = normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw);
  if (!phone) return null;
  const message = fillTemplate(body, templateContextFor(lead, city));
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/* ────────────────────────── LinkedIn X-Ray ────────────────────────── */

export function linkedInXrayUrl(businessName: string, city: string): string {
  const query = `site:linkedin.com/in ("${businessName}" OR "${city}") ("Owner" OR "Founder" OR "Manager")`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/* ────────────────────────── filter prospek ────────────────────────── */

export function matchesFilters(lead: Prospect, filters: LeadFilters): boolean {
  if (lead.website) return false;
  if (filters.phoneOnly && !normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)) return false;
  if (filters.minRating > 0 && (lead.rating ?? 0) < filters.minRating) return false;
  if (filters.minReviews > 0 && lead.reviews < filters.minReviews) return false;
  return true;
}

export function applyFilters(leads: Prospect[], filters: LeadFilters): Prospect[] {
  return leads.filter((lead) => matchesFilters(lead, filters));
}
