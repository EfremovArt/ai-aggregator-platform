import type { MetadataRoute } from 'next';
import { listBlogPosts } from '@/lib/blog';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/login`, changeFrequency: 'monthly' },
    { url: `${APP_URL}/register`, changeFrequency: 'monthly' },
    { url: `${APP_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${APP_URL}/docs`, changeFrequency: 'weekly', priority: 0.6 },
  ];
  let posts: MetadataRoute.Sitemap = [];
  try {
    const list = await listBlogPosts();
    posts = list.map((p) => ({
      url: `${APP_URL}/blog/${p.slug}`,
      lastModified: p.publishedAt,
      changeFrequency: 'monthly',
    }));
  } catch {
    /* ignore */
  }
  return [...staticEntries, ...posts];
}
