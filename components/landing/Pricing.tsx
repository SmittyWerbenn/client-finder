'use client';

import { useState } from 'react';
import CheckoutDialog, { type CheckoutPlan } from './CheckoutDialog';
import { PLAN_CATALOG } from '@/lib/plans';
import { WA_MESSAGES, waLink } from '@/lib/site';

/**
 * Kartu harga landing page.
 *
 * Paket berbayar (Starter & Agency Pro) memakai tombol utama "Beli / Order"
 * yang membuka dialog checkout DOKU — bukan lagi tautan WhatsApp. WhatsApp
 * hanya jadi aksi sekunder "Butuh bantuan / Tanya Admin", dan tetap menjadi
 * kanal utama untuk paket Enterprise/Custom.
 */

const PAID_PLANS = [PLAN_CATALOG.STARTER, PLAN_CATALOG.AGENCY_PRO];

const ENTERPRISE = {
  name: 'ENTERPRISE & CUSTOM ENGINE',
  tagline: 'Untuk tim sales besar, agensi, atau kebutuhan private deployment.',
  price: 'Kustom',
  priceNote: 'Sesuai kebutuhan',
  quota: 'Kuota fleksibel / unlimited via dedicated API key',
  features: [
    'Kategori usaha & kota tanpa batas',
    'Multi-source prospecting data di luar Google Maps',
    'Integrasi otomatis ke CRM internal, webhook, atau WhatsApp gateway perusahaan',
    'Private deployment (on-premise / private cloud) dengan isolasi database',
    'Konsultasi teknis langsung dengan tim engineer',
  ],
};

export default function Pricing() {
  const [selected, setSelected] = useState<CheckoutPlan | null>(null);

  return (
    <section className="lnd-section lnd-section-alt" id="harga">
      <div className="lnd-container">
        <header className="lnd-section-head">
          <span className="lnd-kicker">Harga Lisensi</span>
          <h2>Pilih paket sesuai volume prospecting Anda</h2>
          <p>
            Sekali beli, tanpa biaya bulanan tersembunyi. Pembayaran online otomatis lewat DOKU (Virtual Account,
            QRIS, e-wallet, dan kartu kredit) — kuota aktif setelah pembayaran terkonfirmasi.
          </p>
        </header>

        <div className="lnd-pricing-grid">
          {PAID_PLANS.map((plan) => (
            <article key={plan.id} className={`lnd-plan ${plan.featured ? 'is-featured' : ''}`}>
              {plan.featured ? <span className="lnd-plan-badge">Paling Populer</span> : null}

              <header>
                <h3>{plan.name}</h3>
                <p className="lnd-plan-tagline">{plan.tagline}</p>
              </header>

              <div className="lnd-plan-price">
                <strong>{plan.priceLabel}</strong>
                <span>{plan.priceNote}</span>
              </div>

              <div className="lnd-plan-quota">{plan.quota}</div>

              <ul className="lnd-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="lnd-plan-actions">
                <button
                  type="button"
                  className="lnd-btn lnd-btn-block lnd-btn-primary"
                  onClick={() =>
                    setSelected({ id: plan.id, name: plan.name, priceLabel: plan.priceLabel, quota: plan.quota })
                  }
                >
                  {plan.featured ? 'Beli / Order Paket Pro' : 'Beli / Order Paket Starter'}
                </button>
                <a
                  className="lnd-plan-help"
                  href={waLink(`${WA_MESSAGES.paymentHelp} Paket: ${plan.name}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Butuh bantuan / Tanya Admin
                </a>
              </div>
            </article>
          ))}

          <article className="lnd-plan">
            <header>
              <h3>{ENTERPRISE.name}</h3>
              <p className="lnd-plan-tagline">{ENTERPRISE.tagline}</p>
            </header>

            <div className="lnd-plan-price">
              <strong>{ENTERPRISE.price}</strong>
              <span>{ENTERPRISE.priceNote}</span>
            </div>

            <div className="lnd-plan-quota">{ENTERPRISE.quota}</div>

            <ul className="lnd-plan-features">
              {ENTERPRISE.features.map((feature) => (
                <li key={feature}>
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="lnd-plan-actions">
              <a
                className="lnd-btn lnd-btn-block lnd-btn-outline"
                href={waLink(WA_MESSAGES.customEngine)}
                target="_blank"
                rel="noreferrer"
              >
                Konsultasi Custom Engine
              </a>
            </div>
          </article>
        </div>

        <p className="lnd-pricing-note">
          Pembayaran paket Starter &amp; Agency Pro diproses otomatis melalui DOKU Checkout. Setelah pembayaran
          terkonfirmasi, kuota pencarian ditambahkan ke akun Anda. Butuh invoice perusahaan, pembayaran termin, atau
          paket Enterprise? Hubungi admin via WhatsApp.
        </p>
      </div>

      {selected ? <CheckoutDialog plan={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}
