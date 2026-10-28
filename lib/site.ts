/** Identitas & tautan komersial ClientFinder (dipakai landing page + console demo). */

export const SITE_URL = 'https://client-finder.frel.cloud';

/** Nomor WhatsApp admin penjualan (format internasional tanpa tanda +). */
export const WHATSAPP_ADMIN = '6285782846851';

export const DEMO_HREF = '/console?mode=demo';
export const LOGIN_HREF = '/console/login';

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(message)}`;
}

export const WA_MESSAGES = {
  starter: 'Halo Admin, saya mau order paket Starter ClientFinder (Rp 199rb).',
  pro: 'Halo Admin, saya mau order paket Agency Pro ClientFinder (Rp 499rb).',
  customEngine:
    'Halo Admin, saya tertarik untuk kustomisasi ClientFinder Engine khusus kebutuhan perusahaan saya.',
  consult: 'Halo Admin, saya ingin konsultasi dan membeli akses ClientFinder.',
  demo: 'Halo Admin, saya sudah mencoba demo ClientFinder dan ingin tanya paket langganan.',
} as const;
