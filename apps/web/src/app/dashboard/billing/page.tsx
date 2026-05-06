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
import { formatUsd } from '@/lib/utils';

type Provider = 'STRIPE' | 'CRYPTOCLOUD' | 'TELEGRAM_STARS' | 'YOOMONEY' | 'SBP';

const PROVIDERS: { id: Provider; label: string; sub: string }[] = [
  { id: 'STRIPE', label: 'Карта (Stripe)', sub: 'Visa / Mastercard / Apple Pay' },
  { id: 'CRYPTOCLOUD', label: 'Crypto', sub: 'USDT / BTC / ETH' },
  { id: 'TELEGRAM_STARS', label: 'Telegram Stars', sub: 'Оплата звёздами Telegram' },
  { id: 'YOOMONEY', label: 'YooMoney', sub: 'ЮKassa, рубли' },
  { id: 'SBP', label: 'СБП', sub: 'Система Быстрых Платежей' },
];

interface Balance { balanceUsd: number }
interface Tx { id: string; provider: string; amountUsd: string; status: string; createdAt: string }

export default function BillingPage() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(10);
  const [provider, setProvider] = useState<Provider>('STRIPE');
  const [couponCode, setCouponCode] = useState('');
  const balance = useQuery({ queryKey: ['balance'], queryFn: () => api<Balance>('/billing/balance') });
  const txs = useQuery({ queryKey: ['transactions'], queryFn: () => api<Tx[]>('/billing/transactions') });

  const redeemCoupon = useMutation({
    mutationFn: () =>
      api<{ message: string; amountCreditedUsd: number; code: string }>('/coupons/redeem', {
        method: 'POST',
        json: { code: couponCode.trim() },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      setCouponCode('');
      qc.invalidateQueries({ queryKey: ['balance'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const topup = useMutation({
    mutationFn: () =>
      api<{ paymentUrl?: string }>('/billing/topup', {
        method: 'POST',
        json: { provider, amountUsd: amount },
      }),
    onSuccess: (res) => {
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.success('Транзакция создана');
        qc.invalidateQueries({ queryKey: ['transactions'] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Биллинг</h1>
        <p className="text-sm text-muted-foreground">Пополните баланс и просматривайте историю операций.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Текущий баланс</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight">
              {formatUsd(Number(balance.data?.balanceUsd ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Пополнить</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Сумма (USD)</Label>
              <Input
                id="amount"
                type="number"
                min={5}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Способ оплаты</Label>
              <div className="grid grid-cols-1 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      provider === p.id
                        ? 'border-cyber-violet/60 bg-cyber-violet/10'
                        : 'border-white/10 bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.sub}</div>
                    </div>
                    {provider === p.id && <Badge variant="cyber">Выбрано</Badge>}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="cyber"
              className="w-full"
              disabled={topup.isPending}
              onClick={() => topup.mutate()}
            >
              {topup.isPending ? 'Создаём…' : `Пополнить ${formatUsd(amount)}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Промокод</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="coupon">Введите код</Label>
              <Input
                id="coupon"
                value={couponCode}
                placeholder="WELCOME50"
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button
              variant="cyber"
              disabled={redeemCoupon.isPending || !couponCode.trim()}
              onClick={() => redeemCoupon.mutate()}
            >
              {redeemCoupon.isPending ? 'Применяем…' : 'Применить'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Бонус начисляется на баланс. Коды типа MAY100 — добавляются к следующему пополнению.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>История транзакций</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left">Дата</th><th>Способ</th><th>Сумма</th><th className="text-right">Статус</th></tr>
            </thead>
            <tbody>
              {(txs.data ?? []).map((t) => (
                <tr key={t.id} className="border-t border-white/[0.04]">
                  <td className="py-2">{new Date(t.createdAt).toLocaleString('ru')}</td>
                  <td className="text-center">{t.provider}</td>
                  <td className="text-center">{formatUsd(Number(t.amountUsd))}</td>
                  <td className="py-2 text-right">
                    <Badge
                      variant={
                        t.status === 'SUCCEEDED' ? 'success' : t.status === 'PENDING' ? 'warning' : 'outline'
                      }
                    >
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!txs.data?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Транзакций пока нет</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
