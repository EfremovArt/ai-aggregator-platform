import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LimitsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Лимиты</h1>
      <Card>
        <CardHeader>
          <CardTitle>Защита от перерасхода</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Жёсткие лимиты автоматически защищают баланс:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Дневной лимит расходов (по умолчанию $20)</li>
            <li>Месячный лимит расходов (по умолчанию $200)</li>
            <li>Максимум токенов на один запрос (по умолчанию 8000)</li>
            <li>Hard balance cutoff — когда баланс опустится ниже порога, запросы блокируются</li>
            <li>Sliding-window rate limit на API-ключ и на пользователя</li>
          </ul>
          <p className="pt-2">Чтобы увеличить лимиты — напишите в поддержку.</p>
        </CardContent>
      </Card>
    </div>
  );
}
