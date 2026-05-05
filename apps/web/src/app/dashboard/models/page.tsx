'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Model {
  slug: string;
  displayName: string;
  provider: { displayName: string; status: string };
  pricing: { inputUsdPer1M: number; outputUsdPer1M: number };
  contextLength: number;
  capabilities: string[];
}

export default function ModelsPage() {
  const models = useQuery({ queryKey: ['models'], queryFn: () => api<Model[]>('/models') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Модели</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(models.data ?? []).map((m) => (
          <Card key={m.slug}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{m.provider.displayName}</div>
                  <div className="font-semibold">{m.displayName}</div>
                </div>
                <Badge variant={m.provider.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {m.provider.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-secondary/40 p-2">
                  <div className="font-mono">${m.pricing.inputUsdPer1M.toFixed(2)}</div>
                  <div className="text-muted-foreground">input · 1M</div>
                </div>
                <div className="rounded bg-secondary/40 p-2">
                  <div className="font-mono">${m.pricing.outputUsdPer1M.toFixed(2)}</div>
                  <div className="text-muted-foreground">output · 1M</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {m.capabilities.map((c) => (
                  <Badge key={c} variant="outline">{c.toLowerCase()}</Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Контекст: {m.contextLength.toLocaleString()} токенов</div>
              <code className="block truncate rounded bg-black/40 p-2 font-mono text-xs">{m.slug}</code>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
