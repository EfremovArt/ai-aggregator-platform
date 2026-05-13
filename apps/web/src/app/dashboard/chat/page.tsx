'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Model {
  slug: string;
  displayName: string;
  provider: { displayName: string };
}

interface Assistant {
  slug: string;
  name: string;
  emoji: string | null;
  description: string;
  systemPrompt: string;
  recommendedModel: string | null;
}

interface FreeQuota {
  enabled: boolean;
  virtualSlug: string;
  monthlyTokens: number;
  usedTokens: number;
  remainingTokens: number;
  resetAt: string;
  routedModel: string;
}

interface Msg { role: 'user' | 'assistant' | 'system'; content: string }

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

function ChatPageInner() {
  const search = useSearchParams();
  const modelParam = search.get('model');
  const assistantParam = search.get('assistant');

  const models = useQuery({ queryKey: ['models'], queryFn: () => api<Model[]>('/models') });
  const freeQuota = useQuery({
    queryKey: ['free-tier'],
    queryFn: () => api<FreeQuota>('/free-tier/me'),
    retry: false,
  });
  const assistant = useQuery({
    queryKey: ['assistant', assistantParam],
    queryFn: () => api<Assistant>(`/assistants/${assistantParam}`),
    enabled: !!assistantParam,
    retry: false,
  });

  // Resolve which model should be active. Priority:
  // 1. ?model=... in the URL (explicit user choice from /models page)
  // 2. recommendedModel from the assistant (if ?assistant=... is set)
  // 3. previously chosen model in this component's state (manual select)
  // 4. DEFAULT_MODEL
  const [model, setModel] = useState<string>(modelParam ?? DEFAULT_MODEL);
  const [userPickedModel, setUserPickedModel] = useState<boolean>(!!modelParam);
  useEffect(() => {
    if (modelParam && modelParam !== model) {
      setModel(modelParam);
      setUserPickedModel(true);
    }
  }, [modelParam, model]);
  useEffect(() => {
    if (!userPickedModel && assistant.data?.recommendedModel) {
      setModel(assistant.data.recommendedModel);
    }
  }, [assistant.data?.recommendedModel, userPickedModel]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    // Prepend the assistant's system prompt to the outgoing payload so the
    // upstream model behaves as the chosen assistant. We don't render the
    // system message in the visible chat — keeps the UI clean.
    const systemPrompt = assistant.data?.systemPrompt;
    const outgoing: Msg[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.filter((m) => m.role !== 'system'),
      userMsg,
    ];
    const visible: Msg[] = [...messages, userMsg, { role: 'assistant', content: '' }];
    setMessages(visible);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/chat/completions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });
      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const block of events) {
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const data = dataLine.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data) as { delta?: { content?: string } };
            const chunk = evt.delta?.content;
            if (chunk) {
              setMessages((cur) => {
                const next = [...cur];
                next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + chunk };
                return next;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // If ?model= refers to a model that hasn't loaded into the dropdown yet
  // (e.g. a fresh import), show it anyway so the select doesn't look empty.
  const modelOptions = models.data ?? [];
  const hasModelInList = modelOptions.some((m) => m.slug === model);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      {assistant.data && (
        <div className="rounded-lg border border-cyber-violet/30 bg-cyber-violet/[0.06] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-xl">{assistant.data.emoji}</span>
            <span>{assistant.data.name}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{assistant.data.description}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Чат</h1>
        <select
          className="rounded-md border border-white/10 bg-secondary/40 px-3 py-2 text-sm"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setUserPickedModel(true);
          }}
        >
          {!hasModelInList && model && (
            <option value={model}>{model}</option>
          )}
          {freeQuota.data?.enabled && (
            <option value={freeQuota.data.virtualSlug}>🚀 Grom Free (бесплатно)</option>
          )}
          {modelOptions.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.provider.displayName} · {m.displayName}
            </option>
          ))}
        </select>
        {freeQuota.data?.enabled && (
          <span className="ml-auto text-xs text-muted-foreground">
            Grom Free:{' '}
            <span className="font-mono text-cyber-cyan">
              {freeQuota.data.remainingTokens.toLocaleString('ru')}
            </span>{' '}
            / {freeQuota.data.monthlyTokens.toLocaleString('ru')} токенов
          </span>
        )}
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent ref={scroller} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              {assistant.data
                ? `Задайте вопрос — ${assistant.data.name} ответит со streaming.`
                : 'Задайте вопрос — модель ответит со streaming.'}
            </p>
          )}
          {messages
            .filter((m) => m.role !== 'system')
            .map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary/15 text-foreground'
                      : 'bg-secondary/40 text-foreground'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '…'}</ReactMarkdown>
                </div>
              </div>
            ))}
        </CardContent>
        <div className="border-t border-white/[0.06] p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex gap-2"
          >
            <input
              className="flex-1 rounded-md border border-white/10 bg-secondary/40 px-3 py-2 text-sm"
              placeholder="Введите сообщение…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" variant="cyber" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка чата…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
