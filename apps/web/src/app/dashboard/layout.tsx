import Link from 'next/link';
import { Logo } from '@/components/site/logo';
import { DashboardNav } from '@/components/dashboard/nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-white/[0.06] bg-card/40 backdrop-blur lg:block">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold">AI Aggregator</span>
          </Link>
        </div>
        <DashboardNav />
      </aside>
      <main className="flex flex-col">
        <header className="flex h-16 items-center border-b border-white/[0.06] bg-card/40 px-6 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold">AI Aggregator</span>
          </Link>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
