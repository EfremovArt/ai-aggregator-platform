'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Profile { email: string; displayName?: string; emailVerified: boolean; twoFactorEnabled: boolean }

export default function SettingsPage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/users/me') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <Card>
        <CardHeader><CardTitle>Профиль</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p>Email: {profile.data?.email}</p>
          <p>Имя: {profile.data?.displayName ?? '—'}</p>
          <p>Email подтверждён: {profile.data?.emailVerified ? 'да' : 'нет'}</p>
          <p>2FA: {profile.data?.twoFactorEnabled ? 'включена' : 'выключена'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
