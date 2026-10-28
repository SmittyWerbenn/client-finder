import { cookies } from 'next/headers';
import { DEMO_COOKIE } from './demo-cookie';

/**
 * True bila request berjalan di mode demo interaktif (`/console?mode=demo`).
 * Proxy menanam cookie ini setelah pengunjung membuka tautan demo, sehingga
 * navigasi antar sub-halaman console tetap berada di mode demo.
 */
export async function isDemoMode(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value === '1';
}
