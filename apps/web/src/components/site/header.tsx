'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';

const NAV = [
  { href: '/#models', label: 'Модели' },
  { href: '/#pricing', label: 'Цены' },
  { href: '/#api', label: 'API' },
  { href: '/#business', label: 'Для бизнеса' },
  { href: '/blog', label: 'Блог' },
  { href: '/docs', label: 'Документация' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">AI Aggregator</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Войти
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" variant="cyber">
              Начать бесплатно
            </Button>
          </Link>
        </div>
        <button
          className="md:hidden"
          aria-label="menu"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/[0.06] md:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-3">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full">
                  Войти
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="cyber" className="w-full">
                  Начать
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
