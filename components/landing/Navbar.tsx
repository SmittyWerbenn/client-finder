'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEMO_HREF, LOGIN_HREF } from '@/lib/site';

const LINKS = [
  { href: '#fitur', label: 'Fitur Utama' },
  { href: '#keunggulan', label: 'Keunggulan' },
  { href: '#kategori', label: 'Kategori Bisnis' },
  { href: '#harga', label: 'Harga Lisensi' },
  { href: '#custom', label: 'Custom System' },
  { href: '#faq', label: 'FAQ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`lnd-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="lnd-nav-inner">
        <Link href="/" className="lnd-brand" onClick={() => setOpen(false)}>
          <span className="lnd-brand-mark">CF</span>
          <span className="lnd-brand-text">
            <strong>ClientFinder</strong>
            <em>Prospect Engine</em>
          </span>
        </Link>

        <nav className="lnd-nav-links" aria-label="Navigasi halaman">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lnd-nav-actions">
          <Link href={DEMO_HREF} className="lnd-btn lnd-btn-ghost lnd-btn-sm">
            Coba Demo Gratis
          </Link>
          <Link href={LOGIN_HREF} className="lnd-btn lnd-btn-primary lnd-btn-sm">
            Masuk Console
          </Link>
        </div>

        <button
          type="button"
          className="lnd-burger"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open ? (
        <div className="lnd-mobile">
          <nav aria-label="Navigasi mobile">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="lnd-mobile-actions">
            <Link href={DEMO_HREF} className="lnd-btn lnd-btn-ghost" onClick={() => setOpen(false)}>
              Coba Demo Gratis
            </Link>
            <Link href={LOGIN_HREF} className="lnd-btn lnd-btn-primary" onClick={() => setOpen(false)}>
              Masuk Console
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
