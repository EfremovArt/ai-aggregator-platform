'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Users, ShieldAlert, Flag, BarChart3, Server } from 'lucide-react';

const ITEMS = [
  { href: '/admin', icon: Activity, label: 'Обзор' },
  { href: '/admin/users', icon: Users, label: 'Пользователи' },
  { href: '/admin/fraud', icon: ShieldAlert, label: 'Anti-fraud' },
  { href: '/admin/moderation', icon: Flag, label: 'Модерация' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Аналитика' },
  { href: '/admin/providers', icon: Server, label: 'Провайдеры' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 p-4">
      {ITEMS.map((it) => {
        const active = pathname === it.href || pathname?.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
