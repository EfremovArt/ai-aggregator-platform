'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { OauthButtons } from './oauth-buttons';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type Form = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      await api('/auth/login', { method: 'POST', json: values });
      toast.success('Добро пожаловать!');
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Вход в аккаунт</CardTitle>
        <CardDescription>С возвращением. Введите email и пароль.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OauthButtons />
        <Divider>или</Divider>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {formState.errors.email && (
              <p className="text-xs text-destructive">{formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </div>
          <Button className="w-full" disabled={loading} variant="cyber">
            {loading ? 'Входим…' : 'Войти'}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/forgot-password" className="hover:text-foreground">Забыли пароль?</Link>
          <Link href="/register" className="hover:text-foreground">Создать аккаунт</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative my-1 text-center">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
      <span className="relative bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
