import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Client Finder — Prospek Tanpa Website',
  description:
    'Cari calon klien UMKM dari Google Places yang belum punya website. Filter otomatis, pitch angle siap pakai, export CSV.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
