import type { Metadata } from 'next';
import CheckoutStatus from '@/components/CheckoutStatus';
import '../../landing.css';

export const metadata: Metadata = {
  title: 'Status Pembayaran — ClientFinder',
  description: 'Cek status pembayaran paket ClientFinder (invoice DOKU Checkout).',
  robots: { index: false, follow: false },
};

export default function CheckoutStatusPage() {
  return <CheckoutStatus />;
}
