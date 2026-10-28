/** Identitas & tautan komersial ClientFinder (dipakai landing page + console demo). */

export const SITE_URL = 'https://client-finder.frel.cloud';

/** Nomor WhatsApp admin penjualan (format internasional tanpa tanda +). */
function normalizeWhatsapp(raw: string | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function displayWhatsapp(normalized: string): string {
  if (normalized.length < 10) return normalized;
  const groups = (normalized.slice(2).match(/.{1,4}/g) ?? []).join('-');
  return `+62 ${groups}`;
}

const ENV_WHATSAPP = normalizeWhatsapp(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP);

/** Nomor WhatsApp admin penjualan (format internasional tanpa tanda +). */
export const WHATSAPP_ADMIN = ENV_WHATSAPP || '6285778185971';

/** Nomor WhatsApp admin penjualan untuk ditampilkan ke pengunjung. */
export const WHATSAPP_DISPLAY = ENV_WHATSAPP ? displayWhatsapp(ENV_WHATSAPP) : '+62 857-7818-5971';

export const DEMO_HREF = '/console?mode=demo';
export const LOGIN_HREF = '/console/login';

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(message)}`;
}

/** Tautan kontak admin untuk tombol sekunder "Butuh bantuan / Tanya Admin". */
export function contactHref(message: string): string {
  return waLink(message);
}

export const WA_MESSAGES = {
  starter: 'Halo Admin, saya mau order paket Starter ClientFinder (Rp 199rb).',
  pro: 'Halo Admin, saya mau order paket Agency Pro ClientFinder (Rp 499rb).',
  customEngine:
    'Halo Admin, saya tertarik untuk kustomisasi ClientFinder Engine khusus kebutuhan perusahaan saya.',
  consult: 'Halo Admin, saya ingin konsultasi dan membeli akses ClientFinder.',
  demo: 'Halo Admin, saya sudah mencoba demo ClientFinder dan ingin tanya paket langganan.',
  paymentHelp: 'Halo Admin, saya butuh bantuan untuk pembayaran paket ClientFinder. Mohon dibantu ya.',
} as const;
