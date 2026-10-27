import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  redirect((await verifySessionToken(token)) ? '/dashboard' : '/login');
}
