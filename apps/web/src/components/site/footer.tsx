import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background/40">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="text-base font-semibold">AI Aggregator</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Единый шлюз ко всем популярным AI-моделям. OpenAI, Claude, Gemini,
              DeepSeek, Mistral, Grok, Qwen — один API-ключ, прозрачные цены.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Продукт</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#models" className="hover:text-foreground">Модели</Link></li>
              <li><Link href="/#pricing" className="hover:text-foreground">Цены</Link></li>
              <li><Link href="/#api" className="hover:text-foreground">API</Link></li>
              <li><Link href="/#business" className="hover:text-foreground">Для бизнеса</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Ресурсы</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground">Документация</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Блог</Link></li>
              <li><Link href="/status" className="hover:text-foreground">Статус</Link></li>
              <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Юридическое</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground">Условия</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Конфиденциальность</Link></li>
              <li><Link href="/refund" className="hover:text-foreground">Возвраты</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Контакты</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start gap-3 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} AI Aggregator. Все права защищены.</span>
          <span>v0.1.0 · Powered by Next.js + NestJS</span>
        </div>
      </div>
    </footer>
  );
}
