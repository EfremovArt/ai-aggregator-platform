'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Key {
  id: string;
  name: string;
  prefix: string;
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => api<Key[]>('/api-keys') });

  const create = useMutation({
    mutationFn: () =>
      api<Key & { key: string }>('/api-keys', { method: 'POST', json: { name } }),
    onSuccess: (res) => {
      setRevealed(res.key);
      setName('');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API ключи</h1>
        <p className="text-sm text-muted-foreground">
          Один ключ — доступ ко всем моделям из каталога через OpenAI-совместимый API. Ключ
          показывается один раз — сохраните его сразу.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Создать ключ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="kname">Название</Label>
              <Input id="kname" placeholder="Production server" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button
              variant="cyber"
              className="self-end"
              disabled={!name || create.isPending}
              onClick={() => create.mutate()}
            >
              Создать
            </Button>
          </div>
          {revealed && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <div className="mb-1 font-semibold text-amber-300">Сохраните ключ — он показывается один раз:</div>
              <code className="block rounded bg-black/40 p-2 font-mono text-xs">{revealed}</code>
              <Button variant="outline" size="sm" className="mt-2"
                onClick={() => { navigator.clipboard.writeText(revealed); toast.success('Скопировано'); }}>
                Скопировать
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Все ключи</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 text-left">Название</th>
                <th>Префикс</th>
                <th>Создан</th>
                <th>Использован</th>
                <th className="text-right">Статус</th>
              </tr>
            </thead>
            <tbody>
              {(keys.data ?? []).map((k) => (
                <tr key={k.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{k.name}</td>
                  <td className="text-center font-mono text-xs">{k.prefix}…</td>
                  <td className="text-center">{new Date(k.createdAt).toLocaleDateString('ru')}</td>
                  <td className="text-center">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('ru') : '—'}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Badge variant={k.status === 'ACTIVE' ? 'success' : 'outline'}>{k.status}</Badge>
                      {k.status === 'ACTIVE' && (
                        <Button size="sm" variant="ghost" onClick={() => revoke.mutate(k.id)}>
                          Отозвать
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!keys.data?.length && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Ключей пока нет</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
