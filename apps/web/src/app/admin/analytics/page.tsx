'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUsd } from '@/lib/utils';

interface Group { userId: string; _sum: { amountUsd: string } }

export default function AnalyticsPage() {
  const data = useQuery({ queryKey: ['unprofitable'], queryFn: () => api<Group[]>('/admin/unprofitable-users') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Аналитика</h1>
      <Card>
        <CardHeader><CardTitle>Убыточные пользователи (90д)</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">User ID</th><th className="text-right">Net flow</th></tr>
            </thead>
            <tbody>
              {(data.data ?? []).map((g) => (
                <tr key={g.userId} className="border-t border-white/[0.04]">
                  <td className="py-2 font-mono text-xs">{g.userId}</td>
                  <td className="py-2 text-right text-destructive">{formatUsd(Number(g._sum.amountUsd))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
