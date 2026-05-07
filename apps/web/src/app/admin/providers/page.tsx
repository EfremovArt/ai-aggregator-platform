'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Overview {
  providerHealth: { id: string; status: string; latencyMs: number | null; errorRate: number; lastHealthAt: string | null }[];
}

export default function ProvidersPage() {
  const data = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Overview>('/admin/overview') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Здоровье провайдеров</h1>
      <Card>
        <CardHeader><CardTitle>Latency, error rate, статусы</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">ID</th><th>Status</th><th>Latency (ms)</th><th>Error rate</th><th className="text-right">Last check</th></tr>
            </thead>
            <tbody>
              {(data.data?.providerHealth ?? []).map((p) => (
                <tr key={p.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{p.id}</td>
                  <td className="text-center">
                    <Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'DEGRADED' ? 'warning' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="text-center">{p.latencyMs ?? '—'}</td>
                  <td className="text-center">{(p.errorRate * 100).toFixed(2)}%</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">{p.lastHealthAt ? new Date(p.lastHealthAt).toLocaleString('ru') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
