'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/auth/logout-button';
import {
  LayoutDashboard,
  MessagesSquare,
  Wallet,
  History,
  KeyRound,
  Cpu,
  ShieldAlert,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

const ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Обзор' },
  { href: '/dashboard/chat', icon: MessagesSquare, label: 'Чат' },
  { href: '/dashboard/assistants', icon: Sparkles, label: 'Ассистенты' },
  { href: '/dashboard/billing', icon: Wallet, label: 'Биллинг' },
  { href: '/dashboard/referrals', icon: Users, label: 'Рефералы' },
  { href: '/dashboard/history', icon: History, label: 'История' },
  { href: '/dashboard/api-keys', icon: KeyRound, label: 'API ключи' },
  { href: '/dashboard/models', icon: Cpu, label: 'Модели' },
  { href: '/dashboard/limits', icon: ShieldAlert, label: 'Лимиты' },
  { href: '/dashboard/settings', icon: Settings, label: 'Настройки' },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex h-[calc(100vh-4rem)] flex-col p-4">
      <div className="space-y-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-white/[0.06] text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto border-t border-white/[0.06] pt-3">
        <LogoutButton />
      </div>
    </nav>
  );
}
