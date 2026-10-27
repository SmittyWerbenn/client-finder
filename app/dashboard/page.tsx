import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { demoCategories, DEMO } from '@/lib/demo';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { listCategories } from '@/lib/db';

// Mode normal dinamis (cookie sesi + DB), mode statis tidak.

export default async function DashboardPage() {
  if (DEMO) {
    // Build statis GitHub Pages: tidak ada sesi & DB, kategori dari seed.
    return <Dashboard initialCategories={demoCategories()} mockMode />;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect('/login');

  const categories = await listCategories();
  const mockMode = !process.env.GOOGLE_PLACES_API_KEY?.trim();

  return <Dashboard initialCategories={categories} mockMode={mockMode} />;
}
