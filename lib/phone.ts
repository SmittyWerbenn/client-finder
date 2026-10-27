/** Utilitas nomor telepon Indonesia → format wa.me */

export type NormalizedPhone = {
  /** Angka asli dari Google (bisa null) */
  raw: string;
  /** Format internasional tanpa plus, siap untuk wa.me: 62812xxxx */
  wa: string;
  /** Format tampilan manusiawi: +62 812-3456-7890 */
  display: string;
};

export function normalizePhone(rawInput?: string | null): NormalizedPhone | null {
  if (!rawInput) return null;
  const raw = rawInput.trim();
  if (!raw) return null;

  // Buang semua karakter selain digit dan plus di depan.
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1).replace(/\D/g, '');
  digits = digits.replace(/\D/g, '');
  if (!digits) return null;

  // Normalisasi ke format 62...
  if (digits.startsWith('62')) {
    // ok
  } else if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (digits.length <= 10) {
    // Nomor lokal tanpa prefix (mis. 8123456789 sudah tertangani di atas).
    return null;
  }

  // Validasi panjang wajar nomor Indonesia (termasuk kode negara).
  if (digits.length < 9 || digits.length > 15) return null;

  return { raw, wa: digits, display: formatDisplay(digits) };
}

function formatDisplay(digits62: string): string {
  const rest = digits62.slice(2); // setelah "62"
  // Kelompokkan: 3-4-4 (gaya umum nomor seluler Indonesia)
  const groups: string[] = [];
  let i = 0;
  const pattern = [3, 4, 4, 4];
  for (const size of pattern) {
    if (i >= rest.length) break;
    groups.push(rest.slice(i, i + size));
    i += size;
  }
  if (i < rest.length) groups.push(rest.slice(i));
  return `+62 ${groups.join('-')}`;
}

/** True bila nomor terlihat seperti nomor seluler Indonesia (bisa dihubungi via WhatsApp). */
export function isMobileNumber(wa?: string | null): boolean {
  if (!wa) return false;
  return /^62(8[1-9]|8\d)\d{6,}$/.test(wa.replace(/\D/g, ''));
}
