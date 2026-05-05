'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUsd, formatTokens } from '@/lib/utils';

interface Profile {
  email: string;
  displayName?: string;
  balanceUsd: string;
  lifetimeSpend: string;
  lifetimeTopup: string;
  riskScore: number;
}

interface Analytics {
  recent: {
    id: string;
    modelSlug: string;
    status: string;
    totalTokens: number;
    costUsd: string;
    latencyMs: number | null;
    createdAt: string;
  }[];
  byModel: { modelSlug: string; _sum: { totalTokens: number | null; costUsd: string | null }; _count: number }[];
}

export default function DashboardPage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/users/me') });
  const analytics = useQuery({ queryKey: ['analytics'], queryFn: () => api<Analytics>('/users/me/analytics') });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Здравствуйте, {profile.data?.displayName ?? profile.data?.email ?? '...'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Обзор аккаунта и активность за последние 30 дней.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Баланс" value={formatUsd(Number(profile.data?.balanceUsd ?? 0))} accent />
        <StatCard label="Потрачено" value={formatUsd(Number(profile.data?.lifetimeSpend ?? 0))} />
        <StatCard label="Пополнено" value={formatUsd(Number(profile.data?.lifetimeTopup ?? 0))} />
      </div>

      <Card>
        <CardHeader><CardTitle>Топ моделей</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">Модель</th><th>Запросов</th><th>Токенов</th><th className="text-right">Стоимость</th></tr>
            </thead>
            <tbody>
              {(analytics.data?.byModel ?? []).map((m) => (
                <tr key={m.modelSlug} className="border-t border-white/[0.04]">
                  <td className="py-2 font-mono text-xs">{m.modelSlug}</td>
                  <td className="text-center">{m._count}</td>
                  <td className="text-center">{formatTokens(Number(m._sum.totalTokens ?? 0))}</td>
                  <td className="py-2 text-right">{formatUsd(Number(m._sum.costUsd ?? 0))}</td>
                </tr>
              ))}
              {!analytics.data?.byModel?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Пока нет запросов</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? 'ring-1 ring-cyber-violet/30' : ''}>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
