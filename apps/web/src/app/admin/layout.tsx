import Link from 'next/link';
import { Logo } from '@/components/site/logo';
import { AdminNav } from '@/components/admin/nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-white/[0.06] bg-card/40 backdrop-blur lg:block">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold">Admin</span>
          </Link>
        </div>
        <AdminNav />
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
