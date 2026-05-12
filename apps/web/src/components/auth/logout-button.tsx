'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
}

export function LogoutButton({ className, redirectTo = '/login' }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading) return;
    setLoading(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      // 401 just means the cookie was already expired — proceed to login.
      if (!(e instanceof ApiError) || e.status !== 401) {
        toast.error(e instanceof ApiError ? e.message : 'Не удалось выйти');
        setLoading(false);
        return;
      }
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-60',
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
