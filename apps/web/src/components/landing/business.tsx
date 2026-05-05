'use client';

import { Header } from './models';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ShieldCheck, FileText, Users } from 'lucide-react';

const POINTS = [
  { icon: Building2, title: 'ООО / ИП', desc: 'Договор оферты, закрывающие документы, безналичная оплата.' },
  { icon: ShieldCheck, title: 'Безопасность', desc: 'SOC2-grade практики, шифрование, аудит-логи и SSO для команд.' },
  { icon: FileText, title: 'Бухгалтерия', desc: 'УПД, счёт-фактуры, акт выполненных работ, отчёты по расходам.' },
  { icon: Users, title: 'Командный доступ', desc: 'Роли, проекты, лимиты по командам, RBAC.' },
];

export function Business() {
  return (
    <section id="business" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Для бизнеса"
          title="Платформа уровня enterprise"
          desc="Подключайте AI к продуктам и внутренним процессам — с гарантиями, документами и поддержкой."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <Card key={p.title}>
              <CardContent className="p-6">
                <p.icon className="h-6 w-6 text-cyber-cyan" />
                <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
