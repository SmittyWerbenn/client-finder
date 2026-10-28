/**
 * Katalog paket berbayar ClientFinder — sumber harga TUNGGAL untuk checkout.
 *
 * Harga di landing page dan harga yang dikirim ke DOKU harus selalu identik,
 * jadi angka rupiah tidak boleh ditulis ulang di komponen UI: UI memakai
 * PLAN_CATALOG ini (via prop hasil serialisasi server-safe), route checkout
 * memvalidasi planId terhadap daftar yang sama.
 */

export type PaidPlanId = 'STARTER' | 'AGENCY_PRO';

export type PaidPlan = {
  id: PaidPlanId;
  name: string;
  tagline: string;
  /** Harga dalam rupiah penuh (tanpa desimal) — dipakai langsung sebagai order.amount DOKU. */
  amount: number;
  /** Label harga untuk ditampilkan. */
  priceLabel: string;
  priceNote: string;
  quota: string;
  sessions: number;
  leads: number;
  features: string[];
  cta: string;
  featured?: boolean;
};

export const PLAN_CATALOG: Record<PaidPlanId, PaidPlan> = {
  STARTER: {
    id: 'STARTER',
    name: 'STARTER PASS',
    tagline: 'Cocok untuk freelancer atau tim sales kecil yang baru memulai prospecting.',
    amount: 199000,
    priceLabel: 'Rp 199.000',
    priceNote: 'Top-up / sekali beli',
    quota: '5x Sesi Pencarian (hingga 250 kontak leads)',
    sessions: 5,
    leads: 250,
    features: [
      'Akses basis data 38 provinsi se-Indonesia',
      'Filter status website fleksibel (semua / tanpa / sudah punya)',
      '4 preset template WhatsApp multi-tujuan',
      'Export data ke CSV',
      '1-Click Direct WhatsApp',
    ],
    cta: 'Beli Paket Starter',
  },
  AGENCY_PRO: {
    id: 'AGENCY_PRO',
    name: 'AGENCY PRO',
    tagline: 'Paling pas untuk agency, supplier, dan tim partnership yang prospecting tiap hari.',
    amount: 499000,
    priceLabel: 'Rp 499.000',
    priceNote: 'Top-up / sekali beli',
    quota: '15x Sesi Pencarian (hingga 1.000 kontak leads)',
    sessions: 15,
    leads: 1000,
    features: [
      'Semua fitur di Paket Starter',
      'Mass WhatsApp Broadcast ke seluruh baris tabel',
      'Tool pelacak pemilik bisnis via LinkedIn Decision Maker',
      'Custom template broadcast tanpa batas',
      'Prioritas bantuan support',
    ],
    cta: 'Pilih Paket Pro',
    featured: true,
  },
};

export const PAID_PLAN_IDS = Object.keys(PLAN_CATALOG) as PaidPlanId[];

export function findPaidPlan(planId: string): PaidPlan | null {
  if (!PAID_PLAN_IDS.includes(planId as PaidPlanId)) return null;
  return PLAN_CATALOG[planId as PaidPlanId];
}
