import type { Metadata } from 'next';
import CustomCallout from '@/components/landing/CustomCallout';
import Faq from '@/components/landing/Faq';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import Hero from '@/components/landing/Hero';
import Navbar from '@/components/landing/Navbar';
import Niches from '@/components/landing/Niches';
import Pricing from '@/components/landing/Pricing';
import './landing.css';

export const metadata: Metadata = {
  title: 'ClientFinder — Prospect Engine Bisnis Lokal Tanpa Website',
  description:
    'Temukan ribuan calon klien bisnis lokal siap beli tanpa riset manual. Saring usaha tanpa website di 38 provinsi Indonesia, ambil kontak WhatsApp langsung, dan kirim penawaran sekali klik.',
  alternates: { canonical: 'https://client-finder.frel.cloud' },
  openGraph: {
    title: 'ClientFinder — Prospect Engine Bisnis Lokal',
    description:
      'Mesin pencari prospek berbasis Google Maps: filter bisnis tanpa website, kontak WhatsApp langsung pemilik, outreach massal sekali klik.',
    url: 'https://client-finder.frel.cloud',
    siteName: 'ClientFinder',
    locale: 'id_ID',
    type: 'website',
  },
};

const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'ClientFinder — Prospect Engine',
  description:
    'Mesin pencari prospek bisnis lokal Indonesia berbasis Google Maps dengan filter bisnis tanpa website, kontak WhatsApp langsung, dan outreach massal.',
  brand: { '@type': 'Brand', name: 'ClientFinder' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter Pass',
      price: '199000',
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Agency Pro',
      price: '499000',
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="lnd">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Niches />
        <Pricing />
        <CustomCallout />
        <Faq />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </div>
  );
}
