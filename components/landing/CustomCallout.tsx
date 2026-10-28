import { DEMO_HREF, WA_MESSAGES, waLink } from '@/lib/site';
import Link from 'next/link';

type Pillar = {
  title: string;
  body: string;
  icon: 'data' | 'server' | 'crm' | 'whatsapp';
};

const PILLARS: Pillar[] = [
  {
    icon: 'data',
    title: 'Multi-Source Prospecting Data',
    body: 'Integrasi sumber data prospek tambahan: Google Maps plus direktori bisnis B2B, marketplace data, hingga portal perizinan usaha resmi.',
  },
  {
    icon: 'server',
    title: 'Dedicated Infrastructure & Private API Key',
    body: 'Deployment mandiri (on-premise atau private cloud) dengan isolasi database leads penuh dan kuota API tanpa batas memakai infrastruktur cloud Anda sendiri.',
  },
  {
    icon: 'crm',
    title: 'Otomasi Pipeline ke CRM Internal',
    body: 'Sinkronisasi data prospek otomatis langsung ke CRM atau database perusahaan — HubSpot, Salesforce, Notion, PostgreSQL/MySQL internal via webhook.',
  },
  {
    icon: 'whatsapp',
    title: 'Custom WhatsApp & Auto-Dialer Gateway',
    body: 'Broadcast engine terintegrasi nomor WhatsApp verified atau multi-agent gateway perusahaan, tanpa risiko pembatasan browser.',
  },
];

const FLOW = [
  {
    step: '01',
    title: 'Analisis Kebutuhan Data & Target Market',
    body: 'Pemetaan industri spesifik, parameter filter khusus, dan arsitektur integrasi sistem Anda.',
  },
  {
    step: '02',
    title: 'Kustomisasi Engine & Dedicated Setup',
    body: 'Konfigurasi engine, optimasi query pencarian, dan integrasi webhook ke pipeline sales Anda.',
  },
  {
    step: '03',
    title: 'Deployment & Integrasi Penuh',
    body: 'Pemasangan di domain/subdomain internal, integrasi API key dedicated, dan pengujian end-to-end.',
  },
];

function PillarIcon({ name }: { name: Pillar['icon'] }) {
  if (name === 'data') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    );
  }
  if (name === 'server') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="7" rx="2" />
        <rect x="3" y="13" width="18" height="7" rx="2" />
        <path d="M7 7.5h.01M7 16.5h.01M12 7.5h5M12 16.5h5" />
      </svg>
    );
  }
  if (name === 'crm') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
        <path d="M10 6.5h4a3 3 0 0 1 3 3v4" />
        <path d="M14 10.5h-4a3 3 0 0 0-3 3v0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.6a8.4 8.4 0 0 1-9 8.6 9.3 9.3 0 0 1-3.8-.8L3 21l1.7-4.6A8.3 8.3 0 0 1 3.6 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.6Z" />
      <path d="M8.6 9.6c.5 2.6 2.6 4.7 5.2 5.2l1.2-1.6 2 1c-.3 1.4-1.6 2.3-3 2.1-3.3-.5-5.9-3.1-6.4-6.4-.2-1.4.7-2.7 2.1-3l1 2-1.6 1.2" />
    </svg>
  );
}

export default function CustomCallout() {
  return (
    <section className="lnd-section" id="custom">
      <div className="lnd-container">
        <div className="lnd-custom">
          <header className="lnd-custom-head">
            <span className="lnd-kicker">Custom Engine</span>
            <h2>Custom Prospect Engine &amp; Enterprise Setup</h2>
            <p className="lnd-custom-lead">
              Butuh mesin pencari prospek dengan sumber data khusus, automasi pipeline, atau integrasi internal? Kami
              bangun versi custom ClientFinder sesuai alur kerja tim Anda.
            </p>
            <p className="lnd-custom-body">
              ClientFinder dapat disesuaikan sepenuhnya untuk kebutuhan enterprise. Jika tim Anda membutuhkan sumber
              data di luar Google Maps, integrasi otomatis ke CRM internal, private dedicated server, atau bot broadcast
              WhatsApp mandiri tanpa limitasi, tim engineer kami siap membangun arsitektur khusus untuk organisasi Anda.
            </p>
          </header>

          <ul className="lnd-pillars">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="lnd-pillar">
                <span className="lnd-icon-tile">
                  <PillarIcon name={pillar.icon} />
                </span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </li>
            ))}
          </ul>

          <ol className="lnd-flow">
            {FLOW.map((item) => (
              <li key={item.step} className="lnd-flow-step">
                <span className="lnd-flow-num">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="lnd-custom-foot">
            <p className="lnd-custom-eta">
              Waktu implementasi <b>1–3 minggu</b> sesuai kompleksitas integrasi
            </p>
            <div className="lnd-cta-row">
              <a
                href={waLink(WA_MESSAGES.customEngine)}
                target="_blank"
                rel="noreferrer"
                className="lnd-btn lnd-btn-primary lnd-btn-lg"
              >
                {'\u{1F4AC}'} Konsultasi Kustomisasi Engine
              </a>
              <Link href={DEMO_HREF} className="lnd-btn lnd-btn-outline lnd-btn-lg">
                {'\u{1F5A5}\u{FE0F}'} Coba Console Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
