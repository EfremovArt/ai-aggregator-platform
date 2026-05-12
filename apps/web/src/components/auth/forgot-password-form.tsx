'use client';

import Link from 'next/link';
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

const schema = z.object({
  email: z.string().email('Некорректный email'),
});
type Form = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      await api('/auth/password/forgot', { method: 'POST', json: values });
      setSent(true);
      toast.success('Если такой email зарегистрирован, мы отправили инструкцию.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось отправить запрос');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Восстановление пароля</CardTitle>
        <CardDescription>
          Укажите email — мы отправим ссылку для сброса пароля. Из соображений безопасности
          мы не сообщаем, существует ли такой аккаунт.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
            Готово. Если такой email зарегистрирован, на него ушла ссылка для сброса пароля.
            Проверьте также папку «Спам».
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {formState.errors.email && (
                <p className="text-xs text-destructive">{formState.errors.email.message}</p>
              )}
            </div>
            <Button className="w-full" disabled={loading} variant="cyber">
              {loading ? 'Отправляем…' : 'Отправить ссылку'}
            </Button>
          </form>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Назад ко входу
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Создать аккаунт
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
