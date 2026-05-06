import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1200px] -translate-x-1/2 animate-aurora-shift rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.35),transparent_60%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/3 -z-10 h-[400px] w-[700px] animate-aurora-shift rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,227,255,0.25),transparent_60%)] blur-3xl"
        style={{ animationDelay: '5s' }}
      />
      <div className="container relative pt-20 pb-32 md:pt-28 md:pb-40 text-center">
        <div className="mx-auto inline-flex animate-fade-up">
          <Badge variant="cyber" className="px-3 py-1 text-xs">
            <Sparkles className="mr-1 h-3 w-3" /> 7 моделей · 5 способов оплаты · 1 API ключ
          </Badge>
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl glow-text animate-fade-up [animation-delay:60ms]">
          One API. <span className="gradient-text">Every AI model.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg animate-fade-up [animation-delay:120ms]">
          Единый шлюз к OpenAI, Claude, Gemini, DeepSeek, Mistral, Grok и Qwen.
          Pay-as-you-go, прозрачные цены, корпоративная безопасность.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up [animation-delay:180ms]">
          <Link href="/register">
            <Button size="lg" variant="cyber">
              Начать бесплатно <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/#api">
            <Button size="lg" variant="outline">
              Документация API
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3 animate-fade-up [animation-delay:280ms]">
          <Feature icon={<Zap />} title="Streaming SSE" desc="Низкая задержка, fallback при сбоях провайдера" />
          <Feature icon={<ShieldCheck />} title="Защита 360°" desc="Rate limits, IP-репутация, fingerprint, anti-fraud" />
          <Feature icon={<Sparkles />} title="Cost protection" desc="Жесткие лимиты — нельзя нажечь больше баланса" />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-5 text-left">
      <div className="flex items-center gap-2 text-cyber-cyan">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
