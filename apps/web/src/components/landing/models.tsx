import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MODELS = [
  { provider: 'OpenAI', name: 'GPT-4o', tag: 'Multimodal · 128K', input: 2.5, output: 10 },
  { provider: 'OpenAI', name: 'GPT-4o-mini', tag: 'Cheap · 128K', input: 0.15, output: 0.6 },
  { provider: 'Anthropic', name: 'Claude 3.5 Sonnet', tag: 'Reasoning · 200K', input: 3, output: 15 },
  { provider: 'Anthropic', name: 'Claude 3.5 Haiku', tag: 'Fast · 200K', input: 0.8, output: 4 },
  { provider: 'Google', name: 'Gemini 2.0 Flash', tag: 'Fast · 1M', input: 0.1, output: 0.4 },
  { provider: 'DeepSeek', name: 'DeepSeek-V3', tag: 'Open weights · 128K', input: 0.27, output: 1.1 },
  { provider: 'Mistral', name: 'Mistral Large', tag: 'EU · 128K', input: 2, output: 6 },
  { provider: 'xAI', name: 'Grok 2', tag: 'Realtime · 128K', input: 2, output: 10 },
  { provider: 'Alibaba', name: 'Qwen 2.5 72B', tag: 'Open weights · 128K', input: 0.4, output: 1.2 },
];

export function Models() {
  return (
    <section id="models" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Модели"
          title="Все ведущие AI — в одной точке"
          desc="Прозрачные цены, единый формат запросов, smart routing с fallback."
        />
        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((m) => (
            <Card key={m.name}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{m.provider}</div>
                    <div className="mt-0.5 text-base font-semibold">{m.name}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{m.tag}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-secondary/50 p-2">
                    <div className="text-foreground font-medium">${m.input.toFixed(2)}</div>
                    <div>input · 1M токенов</div>
                  </div>
                  <div className="rounded-md bg-secondary/50 p-2">
                    <div className="text-foreground font-medium">${m.output.toFixed(2)}</div>
                    <div>output · 1M токенов</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Header({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Badge variant="cyber" className="text-[10px] tracking-widest">{eyebrow.toUpperCase()}</Badge>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 text-muted-foreground">{desc}</p>
    </div>
  );
}
