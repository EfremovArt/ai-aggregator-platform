'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, X } from 'lucide-react';

type CouponType = 'FIXED_BONUS' | 'DEPOSIT_BONUS' | 'FREE_TOKENS';

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  amountUsd: string | null;
  bonusPercent: number | null;
  freeTokens: number | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  perUserLimit: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const list = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api<Coupon[]>('/admin/coupons'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/admin/coupons/${id}`, { method: 'PATCH', json: { isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Промокоды</h1>
        <Button onClick={() => setShowForm((v) => !v)} variant="default">
          {showForm ? <X className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
          {showForm ? 'Закрыть' : 'Создать промокод'}
        </Button>
      </div>

      {showForm && <CreateCouponForm onSuccess={() => setShowForm(false)} />}

      <Card>
        <CardHeader>
          <CardTitle>Все промокоды ({list.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-white/[0.06]">
                    <th className="pb-2 text-left">Код</th>
                    <th className="pb-2 text-left">Тип</th>
                    <th className="pb-2 text-left">Размер</th>
                    <th className="pb-2 text-left">Использований</th>
                    <th className="pb-2 text-left">Действует до</th>
                    <th className="pb-2 text-left">Статус</th>
                    <th className="pb-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(list.data ?? []).map((c) => (
                    <tr key={c.id} className="border-t border-white/[0.04]">
                      <td className="py-2 font-mono">{c.code}</td>
                      <td className="py-2">{couponTypeLabel(c.type)}</td>
                      <td className="py-2">{couponSize(c)}</td>
                      <td className="py-2">
                        {c.redemptionsCount}
                        {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ' / ∞'}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {c.validUntil ? new Date(c.validUntil).toLocaleDateString('ru-RU') : 'бессрочно'}
                      </td>
                      <td className="py-2">
                        <Badge variant={c.isActive ? 'default' : 'secondary'}>
                          {c.isActive ? 'активен' : 'выключен'}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggle.mutate({ id: c.id, isActive: !c.isActive })}
                        >
                          {c.isActive ? 'Отключить' : 'Включить'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Удалить промокод ${c.code}?`)) remove.mutate(c.id);
                          }}
                          disabled={remove.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(list.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                        Промокодов пока нет.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function couponTypeLabel(t: CouponType): string {
  switch (t) {
    case 'FIXED_BONUS':
      return 'Фикс. бонус';
    case 'DEPOSIT_BONUS':
      return '% к депозиту';
    case 'FREE_TOKENS':
      return 'Бесплатные токены';
  }
}

function couponSize(c: Coupon): string {
  if (c.type === 'FIXED_BONUS') return c.amountUsd ? `$${Number(c.amountUsd).toFixed(2)}` : '—';
  if (c.type === 'DEPOSIT_BONUS') return c.bonusPercent != null ? `+${c.bonusPercent}%` : '—';
  if (c.type === 'FREE_TOKENS') return c.freeTokens != null ? `${c.freeTokens.toLocaleString()} ток.` : '—';
  return '—';
}

function CreateCouponForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('FIXED_BONUS');
  const [amountUsd, setAmountUsd] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');
  const [freeTokens, setFreeTokens] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api('/admin/coupons', { method: 'POST', json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      onSuccess();
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      type,
      perUserLimit: Number(perUserLimit) || 1,
      isActive: true,
    };
    if (type === 'FIXED_BONUS') payload.amountUsd = Number(amountUsd) || 0;
    if (type === 'DEPOSIT_BONUS') payload.bonusPercent = Number(bonusPercent) || 0;
    if (type === 'FREE_TOKENS') payload.freeTokens = Number(freeTokens) || 0;
    if (maxRedemptions) payload.maxRedemptions = Number(maxRedemptions);
    if (validUntil) payload.validUntil = new Date(validUntil).toISOString();
    if (description) payload.description = description;
    create.mutate(payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новый промокод</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="code">Код</Label>
            <Input
              id="code"
              required
              placeholder="WELCOME50"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label htmlFor="type">Тип</Label>
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-white/[0.08] bg-card px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as CouponType)}
            >
              <option value="FIXED_BONUS">Фиксированный бонус ($)</option>
              <option value="DEPOSIT_BONUS">Бонус к депозиту (%)</option>
              <option value="FREE_TOKENS">Бесплатные токены</option>
            </select>
          </div>
          {type === 'FIXED_BONUS' && (
            <div>
              <Label htmlFor="amount">Сумма (USD)</Label>
              <Input
                id="amount"
                required
                type="number"
                step="0.01"
                min="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
              />
            </div>
          )}
          {type === 'DEPOSIT_BONUS' && (
            <div>
              <Label htmlFor="bonus">Бонус, %</Label>
              <Input
                id="bonus"
                required
                type="number"
                min="1"
                max="500"
                value={bonusPercent}
                onChange={(e) => setBonusPercent(e.target.value)}
              />
            </div>
          )}
          {type === 'FREE_TOKENS' && (
            <div>
              <Label htmlFor="tokens">Токены</Label>
              <Input
                id="tokens"
                required
                type="number"
                min="1"
                value={freeTokens}
                onChange={(e) => setFreeTokens(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="maxR">Лимит активаций (всего)</Label>
            <Input
              id="maxR"
              type="number"
              min="1"
              placeholder="∞"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="perUser">На одного пользователя</Label>
            <Input
              id="perUser"
              type="number"
              min="1"
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="until">Действует до</Label>
            <Input
              id="until"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Описание (видно админам)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Майская акция"
            />
          </div>
          {error && (
            <p className="md:col-span-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onSuccess}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Создаём…' : 'Создать'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
