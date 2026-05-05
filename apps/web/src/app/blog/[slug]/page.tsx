import { notFound } from 'next/navigation';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { getBlogPost } from '@/lib/blog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article' },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return (
    <>
      <Header />
      <article className="container max-w-3xl py-16">
        <div className="text-xs uppercase text-muted-foreground">{post.tags.join(' · ')}</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-3 text-muted-foreground">{post.excerpt}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString('ru')}
        </p>
        <div
          className="prose prose-invert mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
      <Footer />
    </>
  );
}
