'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Profile {
  email: string;
  displayName?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  notifyByEmail: boolean;
  notifyByTelegram: boolean;
  telegramChatId: string | null;
  lowBalanceThresholdUsd: number | null;
}

export default function SettingsPage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/users/me') });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Настройки</h1>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            Email: <span className="font-mono">{profile.data?.email}</span>
          </p>
          <p>Имя: {profile.data?.displayName ?? '—'}</p>
          <p>
            Email подтверждён:{' '}
            <span className={profile.data?.emailVerified ? 'text-green-400' : 'text-yellow-400'}>
              {profile.data?.emailVerified ? 'да' : 'нет — проверьте почту'}
            </span>
          </p>
          <p>2FA: {profile.data?.twoFactorEnabled ? 'включена' : 'выключена'}</p>
        </CardContent>
      </Card>

      {profile.data && <NotificationsCard profile={profile.data} />}
    </div>
  );
}

function NotificationsCard({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [notifyByEmail, setNotifyByEmail] = useState(profile.notifyByEmail);
  const [notifyByTelegram, setNotifyByTelegram] = useState(profile.notifyByTelegram);
  const [telegramChatId, setTelegramChatId] = useState(profile.telegramChatId ?? '');
  const [threshold, setThreshold] = useState(
    profile.lowBalanceThresholdUsd != null ? String(profile.lowBalanceThresholdUsd) : '',
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotifyByEmail(profile.notifyByEmail);
    setNotifyByTelegram(profile.notifyByTelegram);
    setTelegramChatId(profile.telegramChatId ?? '');
    setThreshold(profile.lowBalanceThresholdUsd != null ? String(profile.lowBalanceThresholdUsd) : '');
  }, [profile]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api('/notifications/preferences', { method: 'PATCH', json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({
      notifyByEmail,
      notifyByTelegram,
      telegramChatId: telegramChatId.trim() || null,
      lowBalanceThresholdUsd: threshold ? Number(threshold) : null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Уведомления</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 text-sm">
          <label className="flex items-center justify-between rounded-md border border-white/[0.06] bg-card/40 px-4 py-3">
            <div>
              <div className="font-medium">Email-уведомления</div>
              <div className="text-xs text-muted-foreground">
                Подтверждение регистрации, низкий баланс, успешный платёж, возврат
              </div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer accent-cyber-cyan"
              checked={notifyByEmail}
              onChange={(e) => setNotifyByEmail(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between rounded-md border border-white/[0.06] bg-card/40 px-4 py-3">
            <div>
              <div className="font-medium">Telegram-уведомления</div>
              <div className="text-xs text-muted-foreground">
                В Telegram приходят те же события — для оперативной реакции на hard-cutoff
              </div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer accent-cyber-cyan"
              checked={notifyByTelegram}
              onChange={(e) => setNotifyByTelegram(e.target.checked)}
            />
          </label>

          {notifyByTelegram && (
            <div>
              <Label htmlFor="tgid">Telegram chat ID</Label>
              <Input
                id="tgid"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="например 123456789"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Чтобы узнать свой chat ID: напишите в Telegram-бота{' '}
                <span className="font-mono">@userinfobot</span> — он пришлёт ваш числовой ID. Затем
                напишите боту платформы любое сообщение, чтобы открыть с ним диалог.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="threshold">Порог низкого баланса (USD)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="по-умолчанию $5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Когда баланс упадёт ниже этого значения — придёт уведомление. Сбросится после
              пополнения.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="text-sm text-green-400">Сохранено</span>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
