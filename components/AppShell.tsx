'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { WA_MESSAGES, waLink } from '@/lib/site';
import { ROLE_LABELS, isAdmin } from '@/lib/roles';
import type { SessionUser } from '@/lib/auth';
import type { UsageSnapshot } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  visible: boolean;
};

const DEMO_QUERY = '?mode=demo';

export default function AppShell({
  user,
  usage,
  demo = false,
  children,
}: {
  user: SessionUser;
  usage: UsageSnapshot;
  demo?: boolean;
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
    { href: '/console', label: 'Pencarian Prospek', icon: '⌕', visible: true },
    { href: '/console/leads', label: 'Database Leads', icon: '▤', visible: isAdmin(user.role) },
    { href: '/console/categories', label: 'Kategori & Pitch', icon: '◇', visible: true },
    { href: '/console/api-usage', label: 'API Usage Metrics', icon: '▦', visible: isAdmin(user.role) },
    { href: '/console/users', label: 'Manajemen User', icon: '☷', visible: user.role === 'SUPERADMIN' },
  ];

  const current = [...nav].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === item.href) ?? nav[0];
  const linkTo = (href: string) => (demo ? `${href}${DEMO_QUERY}` : href);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      router.replace('/console/login');
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
            <div className="brand-name">ClientFinder</div>
            <div className="brand-sub">Prospect Engine</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav
            .filter((item) => item.visible)
            .map((item) => {
              const active = item.href === '/console' ? pathname === '/console' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={linkTo(item.href)} className={`sidebar-link ${active ? 'active' : ''}`}>
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

        <div className="sidebar-foot">
          {demo ? (
            <Link href="/" className="sidebar-back">
              ← Kembali ke situs
            </Link>
          ) : (
            <>© {new Date().getFullYear()} ClientFinder</>
          )}
        </div>
      </aside>

      {open ? <button type="button" className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} /> : null}

      <div className="app-body">
        {demo ? (
          <div className="demo-banner" role="status">
            <span className="demo-banner-icon" aria-hidden="true">
              {'\u{1F4A1}'}
            </span>
            <p>
              Anda sedang mencoba ClientFinder dalam <b>Mode Demo</b>. Semua data pencarian di bawah menggunakan simulasi
              data lokal tanpa mengonsumsi kuota Google Places API asli.
              <span className="demo-banner-sub">
                Anda sedang melihat Demo Interaktif ClientFinder (Read-Only). Untuk mulai mencari lead riil dan integrasi
                WhatsApp live, silakan hubungi admin atau login.
              </span>
            </p>
            <div className="demo-banner-actions">
              <a
                className="demo-banner-btn ghost"
                href={waLink(WA_MESSAGES.demo)}
                target="_blank"
                rel="noreferrer"
              >
                Hubungi Admin
              </a>
              <Link className="demo-banner-btn solid" href="/console/login">
                Login
              </Link>
            </div>
          </div>
        ) : null}

        <header className="app-topbar">
          <div className="app-topbar-inner">
            <button type="button" className="top-btn sidebar-toggle" onClick={() => setOpen((value) => !value)} aria-label="Buka menu">
              ☰
            </button>
            <div className="topbar-title">{current.label}</div>
            <div className="topbar-spacer" />
            <div className="user-menu">
              {demo ? <span className="demo-user-badge">Mode Demo (Read-Only)</span> : null}
              <div className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
              <div className="user-meta">
                <span className="user-name">{user.name}</span>
                <span className="user-sub">
                  {demo ? `User / Client · ${user.email}` : `${ROLE_LABELS[user.role]} · ${user.email}`}
                </span>
              </div>
            </div>
            {demo ? (
              <a
                className="topbar-logout demo-exit"
                href="/"
                title="Keluar dari mode demo"
                aria-label="Keluar dari mode demo"
                onClick={() => {
                  document.cookie = 'cf_demo=; Max-Age=0; Path=/';
                  document.cookie = 'is_demo_session=; Max-Age=0; Path=/';
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H9" />
                  <path d="M14 8l4 4-4 4" />
                  <path d="M9 12h9" />
                </svg>
              </a>
            ) : (
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
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H9" />
                    <path d="M14 8l4 4-4 4" />
                    <path d="M9 12h9" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
