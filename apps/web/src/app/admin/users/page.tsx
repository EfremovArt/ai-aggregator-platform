'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatUsd } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  status: string;
  riskScore: number;
  balance: { balanceUsd: string } | null;
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const users = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api<User[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
  const ban = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/admin/users/${id}/ban`, { method: 'POST', json: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const unban = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/admin/users/${id}/unban`, { method: 'POST', json: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Пользователи</h1>
      <Input placeholder="Поиск по email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Card>
        <CardHeader><CardTitle>Список</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">Email</th><th>Status</th><th>Risk</th><th>Balance</th><th className="text-right">Действия</th></tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{u.email}</td>
                  <td className="text-center">
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : u.status === 'BANNED' ? 'destructive' : 'warning'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="text-center">{u.riskScore}</td>
                  <td className="text-center">{formatUsd(Number(u.balance?.balanceUsd ?? 0))}</td>
                  <td className="py-2 text-right">
                    {u.status === 'ACTIVE' ? (
                      <Button size="sm" variant="destructive" onClick={() => ban.mutate({ id: u.id })}>Ban</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => unban.mutate({ id: u.id })}>Unban</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
