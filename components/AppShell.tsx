'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { ROLE_LABELS, isAdmin } from '@/lib/roles';
import type { SessionUser } from '@/lib/auth';
import type { UsageSnapshot } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  visible: boolean;
  hint?: string;
};

export default function AppShell({
  user,
  usage,
  children,
}: {
  user: SessionUser;
  usage: UsageSnapshot;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav: NavItem[] = [
    { href: '/dashboard', label: 'Pencarian Prospek', icon: '⌕', visible: true },
    { href: '/dashboard/leads', label: 'Database Leads', icon: '▤', visible: isAdmin(user.role) },
    { href: '/dashboard/categories', label: 'Kategori & Pitch', icon: '◇', visible: true },
    { href: '/dashboard/api-usage', label: 'API Usage Metrics', icon: '▦', visible: isAdmin(user.role) },
    { href: '/dashboard/users', label: 'Manajemen User', icon: '☷', visible: user.role === 'SUPERADMIN' },
  ];

  const current = [...nav].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === item.href) ?? nav[0];

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const usagePercent = Math.min(100, Math.round((usage.userHits / Math.max(1, usage.userLimit)) * 100));

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${open ? 'open' : ''}`} aria-label="Navigasi utama">
        <div className="sidebar-brand">
          <div className="brand-mark">CF</div>
          <div>
            <div className="brand-name">Client Finder</div>
            <div className="brand-sub">Prospect Engine</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav
            .filter((item) => item.visible)
            .map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
                  <span className="sidebar-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="sidebar-usage">
          <div className="sidebar-usage-head">
            <span>Pemakaian API</span>
            <b>{usagePercent}%</b>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usagePercent}>
            <div className="progress-fill" style={{ width: `${usagePercent}%` }} />
          </div>
          <small>
            {usage.userHits.toLocaleString('id-ID')} / {usage.userLimit.toLocaleString('id-ID')} hit · {usage.period}
          </small>
        </div>

        <div className="sidebar-foot">© {new Date().getFullYear()} Client Finder</div>
      </aside>

      {open ? <button type="button" className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} /> : null}

      <div className="app-body">
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <button type="button" className="top-btn sidebar-toggle" onClick={() => setOpen((value) => !value)} aria-label="Buka menu">
              ☰
            </button>
            <div className="topbar-title">{current.label}</div>
            <div className="topbar-spacer" />
            <div className="user-menu">
              <div className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
              <div className="user-meta">
                <span className="user-name">{user.name}</span>
                <span className="user-sub">
                  {ROLE_LABELS[user.role]} · {user.email}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="topbar-logout"
              onClick={() => void logout()}
              disabled={loggingOut}
              aria-label={loggingOut ? 'Sedang keluar' : 'Keluar'}
              title={loggingOut ? 'Sedang keluar…' : 'Keluar'}
            >
              {loggingOut ? (
                <span className="topbar-logout-spinner" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15" />
                  <path d="M10 8l-4 4 4 4" />
                  <path d="M6 12h9" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
