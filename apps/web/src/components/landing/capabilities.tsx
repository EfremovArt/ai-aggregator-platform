import {
  MessageSquare,
  Code2,
  Image as ImageIcon,
  Film,
  Mic,
  AudioLines,
  Sparkles,
  Database,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CAPS = [
  {
    icon: MessageSquare,
    title: 'Чат и ассистенты',
    desc: 'GPT-4o, Claude, Gemini, DeepSeek и другие — единый интерфейс с памятью контекста.',
    examples: ['Маркетинг-копирайтинг', 'Написание статей', 'Customer support'],
  },
  {
    icon: Code2,
    title: 'Код',
    desc: 'Лучшие модели для кода: Claude Sonnet, GPT-4o, DeepSeek-Coder, Codestral.',
    examples: ['Code review', 'Рефакторинг', 'Function calling / agents'],
  },
  {
    icon: ImageIcon,
    title: 'Изображения',
    desc: 'Midjourney, DALL·E 3, Stable Diffusion 3.5, Flux Pro, Recraft, Ideogram.',
    examples: ['Концепт-арт', 'Реклама / SMM', 'Иллюстрации к статьям'],
  },
  {
    icon: Film,
    title: 'Видео',
    desc: 'Runway Gen-3, Kling 2.0, Luma Dream Machine, Pika, Hailuo — видео из текста и фото.',
    examples: ['Reels / Shorts', 'Анимация концептов', 'Кинематографичные ролики'],
  },
  {
    icon: AudioLines,
    title: 'Голос (TTS)',
    desc: 'ElevenLabs, OpenAI TTS — естественный синтез речи в десятках голосов.',
    examples: ['Озвучка видео', 'Подкасты', 'IVR / voicebots'],
  },
  {
    icon: Mic,
    title: 'Распознавание речи',
    desc: 'OpenAI Whisper и аналоги — расшифровка интервью, звонков, лекций.',
    examples: ['Транскрипция', 'Субтитры', 'Анализ звонков продаж'],
  },
  {
    icon: Sparkles,
    title: 'Музыка',
    desc: 'Suno, MusicGen — генерация музыки по описанию или тексту песни.',
    examples: ['Джинглы', 'Фоновая музыка', 'Демо-треки'],
  },
  {
    icon: Database,
    title: 'Embeddings',
    desc: 'OpenAI v3, Voyage-3, Gemini — векторизация для поиска и RAG-приложений.',
    examples: ['Семантический поиск', 'RAG для документации', 'Кластеризация'],
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="cyber" className="text-[10px] tracking-widest">
            ВОЗМОЖНОСТИ
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Что можно делать на одной платформе
          </h2>
          <p className="mt-3 text-muted-foreground">
            Текст, код, изображения, видео, голос, музыка, распознавание речи, embeddings — без переключений между сервисами.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="glass group relative rounded-2xl p-5 transition-colors hover:border-cyber-violet/40"
              >
                <div className="flex items-center gap-2 text-cyber-cyan">
                  <Icon className="h-5 w-5" />
                  <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                <ul className="mt-3 space-y-1">
                  {c.examples.map((e) => (
                    <li
                      key={e}
                      className="text-xs text-muted-foreground/80 before:mr-1.5 before:text-cyber-violet before:content-['→']"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
