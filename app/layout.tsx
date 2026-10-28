import type { Metadata } from 'next';
import './globals.css';
import './workspace.css';

export const metadata: Metadata = {
  title: 'ClientFinder — Prospect Engine',
  description:
    'Mesin pencari prospek dan partner bisnis lokal berbasis Google Places dengan filter status website opsional, pipeline lead, outreach WhatsApp, dan audit pemakaian API dalam satu platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
