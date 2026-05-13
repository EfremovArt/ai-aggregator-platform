'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Paperclip, X as XIcon, ChevronDown, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRub } from '@/lib/utils';
import { CATEGORIES, categorize, type CategoryKey } from '@/lib/model-categories';

interface Model {
  slug: string;
  displayName: string;
  family: string | null;
  provider: { displayName: string };
  capabilities: string[];
  pricing: {
    inputRubPer1M: number;
    outputRubPer1M: number;
  };
  contextLength: number;
  isFeatured: boolean;
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

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface Attachment {
  id: string;
  kind: 'image' | 'text';
  name: string;
  // For images: a data: URL we forward to the upstream model verbatim.
  // For text: the extracted text content we splice into the user message.
  dataUrl?: string;
  text?: string;
}

interface Msg {
  role: 'user' | 'assistant' | 'system';
  content: string;
  // Only set on user messages with images, for display only.
  attachments?: Attachment[];
}

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB before base64; safe for most providers.
const TEXT_FILE_EXTS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yaml', '.yml'];

// Show the same disjoint categories as /dashboard/models, plus a virtual
// "⭐ Популярные" pinned-first chip. Soon-to-be tabs are hidden in the chat
// picker because they don't represent anything you can talk to today.
type ChatCategoryKey = CategoryKey | 'featured';

const CHAT_PICKER_CATEGORIES: Array<{ key: ChatCategoryKey; label: string }> = [
  { key: 'featured', label: '⭐ Популярные' },
  ...CATEGORIES.filter((c) => c.available && c.key !== 'all').map((c) => ({
    key: c.key,
    label: c.label,
  })),
  { key: 'all', label: 'Все' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Не удалось прочитать файл'));
    r.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Не удалось прочитать файл'));
    r.readAsText(file);
  });
}

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

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<ChatCategoryKey>('featured');
  const [pickerQuery, setPickerQuery] = useState('');

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Look up the active model metadata (caps + pricing). When the model
  // came from a freshly imported batch and hasn't loaded yet, we render
  // a placeholder row.
  const modelOptions = useMemo(() => models.data ?? [], [models.data]);
  const activeModel = useMemo(
    () => modelOptions.find((m) => m.slug === model),
    [modelOptions, model],
  );

  const isFreeTierModel = !!freeQuota.data && model === freeQuota.data.virtualSlug;
  const supportsVision = !!activeModel?.capabilities.includes('IMAGE_INPUT');

  const filteredPickerModels = useMemo(() => {
    const byCat = (() => {
      if (pickerCategory === 'featured') return modelOptions.filter((m) => m.isFeatured);
      if (pickerCategory === 'all') return modelOptions;
      return modelOptions.filter((m) => categorize(m) === pickerCategory);
    })();
    if (!pickerQuery) return byCat.slice(0, 50);
    const q = pickerQuery.toLowerCase();
    return byCat
      .filter(
        (m) => m.displayName.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [modelOptions, pickerCategory, pickerQuery]);

  async function handleFileSelect(files: FileList | null) {
    if (!files) return;
    setError(null);
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      const isImage = f.type.startsWith('image/');
      const lower = f.name.toLowerCase();
      const isTextFile = TEXT_FILE_EXTS.some((ext) => lower.endsWith(ext));
      try {
        if (isImage) {
          if (!supportsVision) {
            setError(
              `Текущая модель не умеет работать с изображениями. Выберите Vision-модель (например GPT-4o, Claude 3.5 Sonnet).`,
            );
            continue;
          }
          if (f.size > MAX_IMAGE_BYTES) {
            setError(`Изображение «${f.name}» больше 5 МБ.`);
            continue;
          }
          const dataUrl = await readFileAsDataUrl(f);
          next.push({
            id: crypto.randomUUID(),
            kind: 'image',
            name: f.name,
            dataUrl,
          });
        } else if (isTextFile) {
          const text = await readFileAsText(f);
          next.push({
            id: crypto.randomUUID(),
            kind: 'text',
            name: f.name,
            text,
          });
        } else {
          setError(
            `Тип «${f.type || f.name}» пока не поддерживается. Можно: изображения (jpg/png/webp/gif) и текстовые файлы (.txt, .md, .csv, .json).`,
          );
        }
      } catch (e) {
        setError((e as Error).message);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = '';
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function send() {
    if ((!input.trim() && attachments.length === 0) || loading) return;
    setError(null);

    // Build the user-visible text. For text files we splice their content
    // into a `<file>` block so the model sees them as part of the prompt.
    const fileBlocks = attachments
      .filter((a) => a.kind === 'text')
      .map((a) => `<file name="${a.name}">\n${a.text}\n</file>`)
      .join('\n\n');
    const userText = [fileBlocks, input.trim()].filter(Boolean).join('\n\n');
    const imageAttachments = attachments.filter((a) => a.kind === 'image');

    const visibleMsg: Msg = {
      role: 'user',
      content: userText,
      attachments: attachments.length ? attachments : undefined,
    };

    // Outgoing payload: image messages become a multimodal content array,
    // text-only messages keep the legacy string shape so older providers
    // keep working untouched.
    const outgoingContent: string | ContentPart[] =
      imageAttachments.length > 0
        ? ([
            { type: 'text', text: userText || ' ' },
            ...imageAttachments.map(
              (a): ContentPart => ({ type: 'image_url', image_url: { url: a.dataUrl ?? '' } }),
            ),
          ] satisfies ContentPart[])
        : userText;

    const systemPrompt = assistant.data?.systemPrompt;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    const outgoing: Array<{ role: string; content: string | ContentPart[] }> = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history,
      { role: 'user', content: outgoingContent },
    ];

    const visible: Msg[] = [...messages, visibleMsg, { role: 'assistant', content: '' }];
    setMessages(visible);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/chat/completions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: outgoing, stream: true }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
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
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + chunk,
                };
                return next;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
      // Drop the placeholder assistant message we appended so the UI doesn't
      // dead-end on an empty bubble.
      setMessages((cur) => cur.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function selectModel(slug: string) {
    setModel(slug);
    setUserPickedModel(true);
    setPickerOpen(false);
    // Switching to a non-vision model clears any pending image uploads —
    // otherwise the user would get a 400 once they hit Send.
    const m = modelOptions.find((mm) => mm.slug === slug);
    if (!m?.capabilities.includes('IMAGE_INPUT')) {
      setAttachments((prev) => prev.filter((a) => a.kind !== 'image'));
    }
  }

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

      <div className="flex flex-wrap items-start gap-3">
        <h1 className="text-2xl font-semibold">Чат</h1>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-secondary/40 px-3 py-2 text-left text-sm hover:border-cyber-violet/40"
          >
            <span className="min-w-0 truncate">
              {activeModel ? (
                <>
                  <span className="text-muted-foreground">
                    {activeModel.provider.displayName} ·{' '}
                  </span>
                  <span className="font-medium">{activeModel.displayName}</span>
                </>
              ) : isFreeTierModel ? (
                '🚀 Grom Free (бесплатно)'
              ) : (
                model
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>

          {pickerOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-white/10 bg-background p-3 shadow-xl">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {freeQuota.data?.enabled && (
                  <button
                    type="button"
                    onClick={() => selectModel(freeQuota.data!.virtualSlug)}
                    className="rounded-md border border-cyber-cyan/30 bg-cyber-cyan/10 px-2.5 py-1 text-xs hover:bg-cyber-cyan/15"
                  >
                    🚀 Grom Free (бесплатно)
                  </button>
                )}
                {CHAT_PICKER_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setPickerCategory(c.key)}
                    className={
                      'rounded-md border px-2.5 py-1 text-xs transition-colors ' +
                      (pickerCategory === c.key
                        ? 'border-cyber-violet/60 bg-cyber-violet/15'
                        : 'border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground')
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
                <input
                  autoFocus
                  className="w-full rounded-md border border-white/10 bg-secondary/40 px-3 py-1.5 pl-7 text-sm"
                  placeholder="Поиск по названию или slug…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                />
              </div>
              <div className="scrollbar-thin max-h-72 overflow-y-auto">
                {filteredPickerModels.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Ничего не найдено
                  </div>
                ) : (
                  filteredPickerModels.map((m) => (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => selectModel(m.slug)}
                      className={
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-cyber-violet/10 ' +
                        (m.slug === model ? 'bg-cyber-violet/10' : '')
                      }
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{m.provider.displayName}</span>{' '}
                        <span className="font-medium">{m.displayName}</span>
                        {m.capabilities.includes('IMAGE_INPUT') && (
                          <span className="ml-1.5 opacity-70">🖼</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-cyber-cyan">
                        {formatRub(m.pricing.inputRubPer1M)} / {formatRub(m.pricing.outputRubPer1M)}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <Link
                href="/dashboard/models"
                className="mt-2 block rounded-md border border-white/10 bg-secondary/30 px-3 py-1.5 text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Все {modelOptions.length} моделей →
              </Link>
            </div>
          )}
        </div>

        {/* Free-tier indicator ONLY when the user actually selected Grom Free.
            Showing it next to a paid model was confusing — it implied quota
            applied to the paid call. */}
        {isFreeTierModel && freeQuota.data && (
          <span className="text-xs text-muted-foreground">
            Grom Free:{' '}
            <span className="font-mono text-cyber-cyan">
              {freeQuota.data.remainingTokens.toLocaleString('ru')}
            </span>{' '}
            / {freeQuota.data.monthlyTokens.toLocaleString('ru')} токенов
          </span>
        )}
      </div>

      {/* Pricing strip: shows what the currently-selected model costs.
          Hidden on the free tier (free is, well, free). */}
      {activeModel && !isFreeTierModel && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-white/[0.06] bg-secondary/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Цена:</span>
          <span>
            input{' '}
            <span className="font-mono text-cyber-cyan">
              {formatRub(activeModel.pricing.inputRubPer1M)}
            </span>{' '}
            / 1M
          </span>
          <span>
            output{' '}
            <span className="font-mono text-cyber-cyan">
              {formatRub(activeModel.pricing.outputRubPer1M)}
            </span>{' '}
            / 1M
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            ≈{' '}
            <span className="font-mono">
              {formatRub((activeModel.pricing.inputRubPer1M + activeModel.pricing.outputRubPer1M) / 1000)}
            </span>{' '}
            за ~1K токенов (≈ 1 короткое сообщение)
          </span>
          {supportsVision && (
            <Badge variant="outline" className="ml-auto">
              🖼 поддерживает изображения
            </Badge>
          )}
        </div>
      )}

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
                  {m.attachments && m.attachments.some((a) => a.kind === 'image') && (
                    <div className="mb-2 flex flex-wrap justify-end gap-1.5">
                      {m.attachments
                        .filter((a) => a.kind === 'image')
                        .map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={a.id}
                            src={a.dataUrl}
                            alt={a.name}
                            className="max-h-40 rounded-md border border-white/10"
                          />
                        ))}
                    </div>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '…'}</ReactMarkdown>
                </div>
              </div>
            ))}
        </CardContent>

        <div className="border-t border-white/[0.06] p-3">
          {error && (
            <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive-foreground">
              {error}
            </div>
          )}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-secondary/40 px-2 py-1 text-xs"
                >
                  {a.kind === 'image' && a.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.dataUrl} alt={a.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span>📄</span>
                  )}
                  <span className="max-w-[12rem] truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="rounded p-0.5 hover:bg-white/10"
                    aria-label={`Удалить ${a.name}`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.txt,.md,.markdown,.csv,.json,.log,.yaml,.yml"
              onChange={(e) => void handleFileSelect(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={loading}
              title={
                supportsVision
                  ? 'Прикрепить изображение или текстовый файл'
                  : 'Прикрепить текстовый файл (картинки — только для vision-моделей)'
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              className="flex-1 rounded-md border border-white/10 bg-secondary/40 px-3 py-2 text-sm"
              placeholder="Введите сообщение…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="cyber"
              disabled={loading || (!input.trim() && attachments.length === 0)}
            >
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
