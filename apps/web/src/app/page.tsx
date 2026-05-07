import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { Hero } from '@/components/landing/hero';
import { Capabilities } from '@/components/landing/capabilities';
import { Assistants } from '@/components/landing/assistants';
import { Models } from '@/components/landing/models';
import { Pricing } from '@/components/landing/pricing';
import { ApiSection } from '@/components/landing/api-section';
import { Business } from '@/components/landing/business';
import { Faq } from '@/components/landing/faq';
import { Reviews } from '@/components/landing/reviews';
import { Cta } from '@/components/landing/cta';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI Aggregator',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: 'Unified gateway to GPT-4, Claude, Gemini, DeepSeek, Mistral, Grok and Qwen.',
  url: APP_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '342',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Capabilities />
        <Assistants />
        <Models />
        <Pricing />
        <ApiSection />
        <Business />
        <Reviews />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
