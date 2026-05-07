'use client';

import Link from 'next/link';
import { Header } from './models';
import { Button } from '@/components/ui/button';

const SAMPLE = `curl https://api.example.com/api/v1/chat/completions \\
  -H "Authorization: Bearer aix_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role":"user","content":"Привет!"}],
    "stream": true
  }'`;

const NODE = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AI_AGGREGATOR_KEY,
  baseURL: "https://api.example.com/api/v1"
});

const stream = await client.chat.completions.create({
  model: "anthropic/claude-3-5-sonnet",
  messages: [{ role: "user", content: "Привет!" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`;

export function ApiSection() {
  return (
    <section id="api" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="API"
          title="OpenAI-совместимый API"
          desc="Замените base URL — и сразу получите доступ ко всем моделям. SDK не нужны."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CodeBlock title="cURL" code={SAMPLE} />
          <CodeBlock title="Node.js (OpenAI SDK)" code={NODE} />
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/docs">
            <Button variant="outline" size="lg">Открыть документацию</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-rose-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-500/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2">{title}</span>
        </div>
      </div>
      <pre className="scrollbar-thin max-h-[420px] overflow-auto p-4 text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
