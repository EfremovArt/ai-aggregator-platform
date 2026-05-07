/**
 * Blog data layer. In production this calls /api/blog/posts on the NestJS API
 * (BlogPost table seeded by Prisma seed). For now we ship a tiny static
 * fallback so the page renders even before the API is up.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publishedAt: string;
}
export interface BlogPost extends BlogPostSummary {
  html: string;
}

const FALLBACK: BlogPost[] = [
  {
    slug: 'welcome',
    title: 'Запуск AI Aggregator: единый шлюз ко всем моделям',
    excerpt:
      'Знакомьтесь с платформой: 7 провайдеров, OpenAI-совместимый API, прозрачные цены и enterprise-grade безопасность.',
    tags: ['Релизы'],
    publishedAt: new Date().toISOString(),
    html: `<p>Мы запустили единый шлюз ко всем популярным AI-моделям. Один API ключ — доступ к OpenAI, Anthropic, Google, DeepSeek, Mistral, xAI и Qwen. Pay-as-you-go, прозрачные цены, корпоративная безопасность.</p>`,
  },
];

async function fetchWithTimeout(url: string, ms = 1500) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { next: { revalidate: 600 }, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function listBlogPosts(): Promise<BlogPostSummary[]> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/api/blog/posts`);
    if (res.ok) return (await res.json()) as BlogPostSummary[];
  } catch {
    /* ignore */
  }
  return FALLBACK.map(({ html: _html, ...rest }) => rest);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/api/blog/posts/${encodeURIComponent(slug)}`);
    if (res.ok) return (await res.json()) as BlogPost;
  } catch {
    /* ignore */
  }
  return FALLBACK.find((p) => p.slug === slug) ?? null;
}
