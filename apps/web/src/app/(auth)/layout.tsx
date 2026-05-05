import Link from 'next/link';
import { Logo } from '@/components/site/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 animate-aurora-shift rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.3),transparent_60%)] blur-3xl"
      />
      <div className="container flex min-h-screen flex-col items-center justify-center py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold">AI Aggregator</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
