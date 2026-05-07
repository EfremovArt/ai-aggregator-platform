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
  email: z.string().email('Некорректный email'),
  password: z.string().min(10, 'Минимум 10 символов'),
  displayName: z.string().min(1).max(64).optional(),
});
type Form = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      await api('/auth/register', { method: 'POST', json: values });
      toast.success('Аккаунт создан. Проверьте почту.');
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Создать аккаунт</CardTitle>
        <CardDescription>30 секунд — и у вас один API-ключ ко всем моделям.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OauthButtons />
        <div className="relative my-1 text-center">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
          <span className="relative bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
            или
          </span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Имя</Label>
            <Input id="displayName" autoComplete="name" {...register('displayName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {formState.errors.email && (
              <p className="text-xs text-destructive">{formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {formState.errors.password && (
              <p className="text-xs text-destructive">{formState.errors.password.message}</p>
            )}
          </div>
          <Button className="w-full" disabled={loading} variant="cyber">
            {loading ? 'Создаём…' : 'Создать аккаунт'}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Регистрируясь, вы соглашаетесь с{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Условиями
          </Link>{' '}
          и{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Политикой
          </Link>
          .
        </p>
        <p className="text-center text-xs">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
