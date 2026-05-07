'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUsd, formatTokens } from '@/lib/utils';

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
  ledger: { id: string; kind: string; amountUsd: string; balanceAfter: string; description: string; createdAt: string }[];
}

export default function HistoryPage() {
  const data = useQuery({ queryKey: ['analytics'], queryFn: () => api<Analytics>('/users/me/analytics') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">История</h1>
      <Card>
        <CardHeader><CardTitle>Последние запросы</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 text-left">Дата</th>
                <th>Модель</th>
                <th>Токены</th>
                <th>Latency</th>
                <th className="text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {(data.data?.recent ?? []).map((r) => (
                <tr key={r.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{new Date(r.createdAt).toLocaleString('ru')}</td>
                  <td className="text-center font-mono text-xs">{r.modelSlug}</td>
                  <td className="text-center">{formatTokens(r.totalTokens)}</td>
                  <td className="text-center">{r.latencyMs ?? '—'} ms</td>
                  <td className="py-2 text-right">
                    <Badge variant={r.status === 'SUCCESS' ? 'success' : 'destructive'} className="mr-2">
                      {r.status}
                    </Badge>
                    {formatUsd(Number(r.costUsd))}
                  </td>
                </tr>
              ))}
              {!data.data?.recent?.length && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">История пуста</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 text-left">Дата</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Сумма</th>
                <th className="text-right">Баланс после</th>
              </tr>
            </thead>
            <tbody>
              {(data.data?.ledger ?? []).map((e) => (
                <tr key={e.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{new Date(e.createdAt).toLocaleString('ru')}</td>
                  <td className="text-center">{e.kind}</td>
                  <td className="text-center text-xs text-muted-foreground">{e.description}</td>
                  <td className="text-center">{formatUsd(Number(e.amountUsd))}</td>
                  <td className="py-2 text-right">{formatUsd(Number(e.balanceAfter))}</td>
                </tr>
              ))}
              {!data.data?.ledger?.length && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Записей пока нет</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
