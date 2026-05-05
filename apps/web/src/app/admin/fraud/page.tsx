'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Signal {
  id: string;
  kind: string;
  weight: number;
  createdAt: string;
  ip: string | null;
  fingerprint: string | null;
  user: { email: string } | null;
}

export default function FraudPage() {
  const data = useQuery({ queryKey: ['fraud'], queryFn: () => api<Signal[]>('/admin/fraud-feed') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Anti-fraud feed</h1>
      <Card>
        <CardHeader><CardTitle>Последние сигналы</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">Дата</th><th>Тип</th><th>Вес</th><th>Email</th><th>IP</th><th className="text-right">Fingerprint</th></tr>
            </thead>
            <tbody>
              {(data.data ?? []).map((s) => (
                <tr key={s.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{new Date(s.createdAt).toLocaleString('ru')}</td>
                  <td className="text-center"><Badge variant="warning">{s.kind}</Badge></td>
                  <td className="text-center">{s.weight}</td>
                  <td className="text-center text-xs">{s.user?.email ?? '—'}</td>
                  <td className="text-center font-mono text-xs">{s.ip ?? '—'}</td>
                  <td className="py-2 text-right font-mono text-[10px] text-muted-foreground">{s.fingerprint?.slice(0, 12) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
