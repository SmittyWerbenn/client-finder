import type { Metadata } from 'next';
import CustomCallout from '@/components/landing/CustomCallout';
import Faq from '@/components/landing/Faq';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import Hero from '@/components/landing/Hero';
import Navbar from '@/components/landing/Navbar';
import Niches from '@/components/landing/Niches';
import Pricing from '@/components/landing/Pricing';
import UseCases from '@/components/landing/UseCases';
import './landing.css';

export const metadata: Metadata = {
  title: 'ClientFinder — B2B Prospecting & Partnership Engine Bisnis Lokal',
  description:
    'Temukan ribuan calon klien dan partner bisnis lokal siap kolaborasi tanpa riset manual. Saring bisnis di 38 provinsi Indonesia, dapatkan kontak decision maker, dan jalankan outreach WhatsApp sekali klik.',
  alternates: { canonical: 'https://client-finder.frel.cloud' },
  openGraph: {
    title: 'ClientFinder — B2B Prospecting & Partnership Engine',
    description:
      'Mesin pencari prospek B2B berbasis Google Maps: filter status website fleksibel, kontak WhatsApp langsung, template kemitraan/suplai, outreach massal sekali klik.',
    url: 'https://client-finder.frel.cloud',
    siteName: 'ClientFinder',
    locale: 'id_ID',
    type: 'website',
  },
};

const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'ClientFinder — B2B Prospecting & Partnership Engine',
  description:
    'Mesin pencari prospek dan partner bisnis lokal Indonesia berbasis Google Maps dengan filter status website opsional (semua bisnis, tanpa website, atau sudah punya website), kontak WhatsApp langsung, dan outreach multi-tujuan.',
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
        <UseCases />
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
