'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUsd } from '@/lib/utils';

interface Overview {
  users: { total: number; active30d: number };
  requests30d: number;
  revenue30dUsd: number;
  apiSpend30dUsd: number;
  margin30dUsd: number;
  modelStats: { slug: string; requests: number; revenueUsd: number; costUsd: number; marginUsd: number }[];
  providerHealth: { id: string; status: string; latencyMs: number | null; errorRate: number }[];
}

export default function AdminOverviewPage() {
  const data = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Overview>('/admin/overview') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Обзор</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KPI label="Пользователи" value={data.data?.users.total ?? 0} />
        <KPI label="Активных (30д)" value={data.data?.users.active30d ?? 0} />
        <KPI label="Revenue (30д)" value={formatUsd(data.data?.revenue30dUsd ?? 0)} />
        <KPI label="Margin (30д)" value={formatUsd(data.data?.margin30dUsd ?? 0)} accent />
      </div>

      <Card>
        <CardHeader><CardTitle>Топ моделей</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">Модель</th><th>Запросов</th><th>Revenue</th><th>Cost</th><th className="text-right">Margin</th></tr>
            </thead>
            <tbody>
              {(data.data?.modelStats ?? []).map((m) => (
                <tr key={m.slug} className="border-t border-white/[0.04]">
                  <td className="py-2 font-mono text-xs">{m.slug}</td>
                  <td className="text-center">{m.requests}</td>
                  <td className="text-center">{formatUsd(m.revenueUsd)}</td>
                  <td className="text-center">{formatUsd(m.costUsd)}</td>
                  <td className="py-2 text-right text-cyber-cyan">{formatUsd(m.marginUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Провайдеры</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">ID</th><th>Status</th><th>Latency</th><th className="text-right">Error rate</th></tr>
            </thead>
            <tbody>
              {(data.data?.providerHealth ?? []).map((p) => (
                <tr key={p.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{p.id}</td>
                  <td className="text-center">{p.status}</td>
                  <td className="text-center">{p.latencyMs ?? '—'} ms</td>
                  <td className="py-2 text-right">{(p.errorRate * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={accent ? 'ring-1 ring-cyber-violet/30' : ''}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
