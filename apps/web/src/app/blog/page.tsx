import Link from 'next/link';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { listBlogPosts } from '@/lib/blog';

export const metadata = {
  title: 'Блог',
  description: 'Статьи об AI, моделях, продакт-разработке и API-интеграциях.',
};
export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await listBlogPosts();
  return (
    <>
      <Header />
      <main className="container py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Блог</h1>
        <p className="mt-3 text-muted-foreground">
          Технические статьи, апдейты платформы, релизы провайдеров и моделей.
        </p>
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.slug} className="glass rounded-2xl p-6 transition-colors hover:bg-white/[0.05]">
              <div className="text-xs uppercase text-muted-foreground">{p.tags.join(' · ')}</div>
              <h2 className="mt-2 text-lg font-semibold">
                <Link href={`/blog/${p.slug}`} className="hover:text-primary">{p.title}</Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {new Date(p.publishedAt).toLocaleDateString('ru')}
              </p>
            </li>
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-muted-foreground">Статьи появятся здесь после первой публикации.</p>
          )}
        </ul>
      </main>
      <Footer />
    </>
  );
}
