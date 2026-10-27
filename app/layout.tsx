import type { Metadata } from 'next';
import './globals.css';
import './workspace.css';

export const metadata: Metadata = {
  title: 'ClientFinder — Prospect Engine',
  description:
    'Temukan bisnis lokal tanpa website dari Google Places, kelola pipeline lead, dan audit pemakaian API dalam satu platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
