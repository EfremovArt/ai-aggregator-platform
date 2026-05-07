import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const posts = await this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      publishedAt: p.publishedAt?.toISOString() ?? p.createdAt.toISOString(),
    }));
  }

  async get(slug: string) {
    const p = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!p || !p.published) throw new NotFoundException();
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      publishedAt: p.publishedAt?.toISOString() ?? p.createdAt.toISOString(),
      html: this.markdownToHtml(p.content),
    };
  }

  /** Tiny safe markdown → HTML converter. For richer formatting, use a real renderer at the edge. */
  private markdownToHtml(md: string) {
    const escaped = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const lines = escaped.split('\n');
    const out: string[] = [];
    let inP = false;
    for (const line of lines) {
      if (/^#\s/.test(line)) {
        if (inP) { out.push('</p>'); inP = false; }
        out.push(`<h1>${line.slice(2)}</h1>`);
      } else if (/^##\s/.test(line)) {
        if (inP) { out.push('</p>'); inP = false; }
        out.push(`<h2>${line.slice(3)}</h2>`);
      } else if (line.trim() === '') {
        if (inP) { out.push('</p>'); inP = false; }
      } else {
        if (!inP) { out.push('<p>'); inP = true; }
        out.push(line + ' ');
      }
    }
    if (inP) out.push('</p>');
    return out.join('\n');
  }
}
