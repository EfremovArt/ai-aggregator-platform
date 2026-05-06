'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatUsd } from '@/lib/utils';

type Me = {
  code: string;
  appUrl: string;
  link: string;
  settings: {
    enabled: boolean;
    referrerBonusUsd: number;
    referredBonusUsd: number;
  };
};

type Stats = {
  totalReferred: number;
  totalBonusUsd: number;
  pendingBonusUsd: number;
  referrals: Array<{
    id: string;
    code: string;
    bonusUsd: number;
    paidOut: boolean;
    createdAt: string;
    referredEmail: string;
    referredDisplayName: string | null;
    referredLifetimeTopupUsd: number;
  }>;
};

export default function ReferralsPage() {
  const me = useQuery({ queryKey: ['referrals-me'], queryFn: () => api<Me>('/referrals/me') });
  const stats = useQuery({ queryKey: ['referrals-stats'], queryFn: () => api<Stats>('/referrals/stats') });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Скопировано в буфер');
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Реферальная программа</h1>
        <p className="text-sm text-muted-foreground">
          Приглашайте друзей по своей ссылке и получайте бонус на баланс при их первом пополнении.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ваш реферальный код</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Код</div>
              <div className="flex gap-2">
                <Input readOnly value={me.data?.code ?? '—'} className="font-mono" />
                <Button variant="outline" onClick={() => me.data && copy(me.data.code)}>
                  Копировать
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Ссылка</div>
              <div className="flex gap-2">
                <Input readOnly value={me.data?.link ?? '—'} />
                <Button variant="outline" onClick={() => me.data && copy(me.data.link)}>
                  Копировать
                </Button>
              </div>
            </div>
            {me.data?.settings && (
              <div className="rounded-lg border border-white/10 bg-secondary/30 p-3 text-xs">
                <div>
                  Вам — <span className="font-semibold text-foreground">{formatUsd(me.data.settings.referrerBonusUsd)}</span>{' '}
                  за каждого приглашённого, который пополнит баланс.
                </div>
                <div>
                  Другу — <span className="font-semibold text-foreground">{formatUsd(me.data.settings.referredBonusUsd)}</span>{' '}
                  приветственный бонус.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Приглашено</div>
                <div className="mt-1 text-2xl font-semibold">{stats.data?.totalReferred ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Заработано</div>
                <div className="mt-1 text-2xl font-semibold">{formatUsd(stats.data?.totalBonusUsd ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">В ожидании</div>
                <div className="mt-1 text-2xl font-semibold">{formatUsd(stats.data?.pendingBonusUsd ?? 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Приглашённые пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 text-left">Дата</th>
                <th className="text-left">Email</th>
                <th>Пополнение</th>
                <th>Бонус</th>
                <th className="text-right">Статус</th>
              </tr>
            </thead>
            <tbody>
              {(stats.data?.referrals ?? []).map((r) => (
                <tr key={r.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{new Date(r.createdAt).toLocaleDateString('ru')}</td>
                  <td>{r.referredEmail}</td>
                  <td className="text-center">{formatUsd(r.referredLifetimeTopupUsd)}</td>
                  <td className="text-center">{formatUsd(r.bonusUsd)}</td>
                  <td className="py-2 text-right">
                    <Badge variant={r.paidOut ? 'success' : 'warning'}>
                      {r.paidOut ? 'Выплачен' : 'Ожидает'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!stats.data?.referrals?.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Пока никого нет — поделитесь ссылкой выше
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
