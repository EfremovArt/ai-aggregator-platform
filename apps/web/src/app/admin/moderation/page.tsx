'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Item {
  id: string;
  status: string;
  categories: string[];
  source: string;
  contentSnippet: string | null;
  createdAt: string;
  user: { email: string } | null;
}

export default function ModerationPage() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ['mod-queue'], queryFn: () => api<Item[]>('/admin/moderation-queue') });
  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      api(`/admin/moderation/${id}/${status}`, { method: 'POST', json: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mod-queue'] }),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Модерация</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(items.data ?? []).map((it) => (
          <Card key={it.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{it.user?.email ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{new Date(it.createdAt).toLocaleString('ru')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {it.categories.map((c) => <Badge key={c} variant="destructive">{c}</Badge>)}
                <Badge variant="outline">{it.source}</Badge>
              </div>
              <pre className="scrollbar-thin max-h-32 overflow-auto rounded-md bg-black/40 p-3 text-xs">
                {it.contentSnippet}
              </pre>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: it.id, status: 'APPROVED' })}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => resolve.mutate({ id: it.id, status: 'REJECTED' })}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!items.data?.length && (
          <p className="text-sm text-muted-foreground">Очередь пуста.</p>
        )}
      </div>
    </div>
  );
}
