import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Providers } from '@/components/providers';
import { CookieConsent } from '@/components/site/cookie-consent';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'AI Aggregator — One API. Every model.',
    template: '%s — AI Aggregator',
  },
  description:
    'Unified gateway to GPT-4, Claude, Gemini, DeepSeek, Mistral, Grok and Qwen. Pay-as-you-go, no subscription, transparent pricing.',
  keywords: [
    'AI gateway',
    'OpenAI',
    'Claude',
    'Gemini',
    'DeepSeek',
    'OpenRouter',
    'API aggregator',
    'GPT-4',
  ],
  authors: [{ name: 'AI Aggregator' }],
  openGraph: {
    type: 'website',
    title: 'AI Aggregator — One API. Every model.',
    description: 'Unified gateway to all major AI models with one API key.',
    url: APP_URL,
    siteName: 'AI Aggregator',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Aggregator — One API. Every model.',
    description: 'Unified gateway to all major AI models.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0b1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen scrollbar-thin">
        <Providers>{children}</Providers>
        <Toaster position="top-right" theme="dark" richColors />
        <CookieConsent />
      </body>
    </html>
  );
}
