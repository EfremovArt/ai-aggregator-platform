'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet } from 'lucide-react';

const ENTITIES = [
  {
    key: 'users',
    label: 'Пользователи',
    description: 'email, баланс, lifetime spend, страна, риск-скор',
  },
  {
    key: 'transactions',
    label: 'Транзакции',
    description: 'все пополнения по всем платежным провайдерам',
  },
  {
    key: 'requests',
    label: 'API-запросы',
    description: 'логи запросов: модель, токены, стоимость, маржа',
  },
  {
    key: 'coupons',
    label: 'Промокоды',
    description: 'все промокоды с количеством активаций',
  },
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminExportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function download(entity: string) {
    setBusy(entity);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      const url = `${API_URL}/api/admin/export/${entity}.csv${params.size ? `?${params}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        alert(`Ошибка экспорта: ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Экспорт данных</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV в кодировке UTF-8 с BOM — открывается в Excel и Google Sheets без настройки.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Период</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="from">С даты</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">По дату</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Оставьте пустым — экспортирует все доступные записи.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ENTITIES.map((e) => (
          <Card key={e.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-cyber-cyan" />
                {e.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{e.description}</p>
              <Button onClick={() => download(e.key)} disabled={busy === e.key} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {busy === e.key ? 'Готовим CSV…' : `Скачать ${e.key}.csv`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
