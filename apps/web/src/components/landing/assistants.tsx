import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Preset = {
  emoji: string;
  name: string;
  description: string;
  category: string;
};

const PRESETS: Preset[] = [
  { emoji: '📈', name: 'Маркетолог', description: 'Заголовки, лендинги, рассылки', category: 'marketing' },
  { emoji: '📝', name: 'Грамотей', description: 'Грамматика, стилистика, перевод', category: 'writing' },
  { emoji: '📄', name: 'Резюме', description: 'CV под вакансию + сопроводительное', category: 'business' },
  { emoji: '📱', name: 'SMM-ассистент', description: 'Контент-планы для Telegram, VK', category: 'marketing' },
  { emoji: '🎭', name: 'Поэт', description: 'Стихи, песни и рифмы по поводу', category: 'creative' },
  { emoji: '🎬', name: 'Сценарист', description: 'Reels, Shorts, рекламные ролики', category: 'creative' },
  { emoji: '🧪', name: 'Промпт-инженер', description: 'Качественные промпты для LLM', category: 'creative' },
  { emoji: '🎨', name: 'Image-prompt', description: 'Промпты для Midjourney, DALL·E', category: 'creative' },
  { emoji: '🛠️', name: 'Code Reviewer', description: 'Ревью, баги, безопасность', category: 'code' },
  { emoji: '🗄️', name: 'SQL-эксперт', description: 'Запросы, индексы, оптимизация', category: 'code' },
  { emoji: '⚙️', name: 'DevOps-помощник', description: 'Docker, CI/CD, Nginx', category: 'code' },
  { emoji: '🩺', name: 'Доктор-AI', description: 'Объяснение терминов и анализов', category: 'personal' },
  { emoji: '🇬🇧', name: 'Учитель английского', description: 'Грамматика, IELTS, разговор', category: 'education' },
  { emoji: '✉️', name: 'Email-копирайтер', description: 'Холодные письма и follow-up', category: 'business' },
  { emoji: '⚖️', name: 'Юрист-помощник', description: 'NDA, оферта, объяснение договоров', category: 'business' },
  { emoji: '📊', name: 'Бизнес-план', description: 'Модель, юнит-экономика, риски', category: 'business' },
  { emoji: '🧮', name: 'Репетитор математики', description: 'Школа и университет — по шагам', category: 'education' },
  { emoji: '🌍', name: 'Переводчик', description: 'RU↔EN/DE/FR/ES/ZH с сохранением стиля', category: 'writing' },
];

export function Assistants() {
  return (
    <section id="assistants" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="cyber" className="text-[10px] tracking-widest">
            АССИСТЕНТЫ
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Готовые ассистенты под задачу
          </h2>
          <p className="mt-3 text-muted-foreground">
            18 пресетов с настроенными системными промптами — выберите профессионала и работайте без
            долгого «подсказывания» модели.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PRESETS.map((p) => (
            <Link
              key={p.name}
              href="/dashboard/assistants"
              className="glass group flex flex-col rounded-2xl p-4 transition-colors hover:border-cyber-violet/40"
            >
              <div className="text-2xl">{p.emoji}</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{p.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.description}</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard/assistants">Все 18 ассистентов →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
