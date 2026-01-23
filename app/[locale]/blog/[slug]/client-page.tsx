'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShareButtons } from '@/components/ui/share-buttons';
import type { Blog } from '@/lib/data/types';
import type { Locale } from '@/i18n';
import MarkdownRenderer from '@/components/blog/markdown-renderer';

interface BlogDetailClientPageProps {
  blog: Blog;
  locale: Locale;
}

// Helper to strip markdown formatting from text
const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    // Remove common excerpt labels (📖 Excerpt, Excerpt:, etc.)
    .replace(/^📖\s*Excerpt\s*/i, '')
    .replace(/^Excerpt[:\s]*/i, '')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text**, *text*, __text__, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove blockquotes (> text)
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Helper to get localized content
const getLocalizedContent = (blog: Blog, locale: Locale) => {
  let title = blog.title;
  let excerpt = blog.excerpt || '';
  let content = blog.content;

  if (locale === 'en' && blog.title_en) {
    title = blog.title_en;
    excerpt = blog.excerpt_en || excerpt;
    content = blog.content_en || content;
  } else if (locale === 'fr' && blog.title_fr) {
    title = blog.title_fr;
    excerpt = blog.excerpt_fr || excerpt;
    content = blog.content_fr || content;
  } else if (locale === 'de' && blog.title_de) {
    title = blog.title_de;
    excerpt = blog.excerpt_de || excerpt;
    content = blog.content_de || content;
  }

  return { title, excerpt, content };
};

export default function BlogDetailClientPage({ blog, locale }: BlogDetailClientPageProps) {
  const t = useTranslations('blog');
  const { title, excerpt, content } = getLocalizedContent(blog, locale);

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Link href={`/${locale}/blog`} className="text-[#1BDD95] hover:underline">
            {t('backToBlog')}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {blog.category && (
              <Badge variant="outline">{blog.category}</Badge>
            )}
            {blog.featured && (
              <Badge variant="default" className="bg-yellow-500">Featured</Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4">{title}</h1>
          {excerpt && (
            <p className="text-xl text-gray-600 mb-4">{stripMarkdown(excerpt)}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            {blog.author && (
              <span>{t('author')}: {blog.author}</span>
            )}
            {blog.published_at && (
              <span>{t('publishedOn')} {format(new Date(blog.published_at), 'PPP')}</span>
            )}
          </div>
          {/* Share Buttons */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{t('share')}</span>
            <ShareButtons
              shareUrl={typeof window !== 'undefined' ? window.location.href : `/${locale}/blog/${blog.slug}`}
              shareTitle={title}
            />
          </div>
        </div>

        {/* Thumbnail/Video */}
        {blog.video_url ? (
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <video
              src={blog.video_url}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
              aria-label={title}
            />
          </div>
        ) : blog.thumbnail_url && (
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={blog.thumbnail_url}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <MarkdownRenderer content={content} />
        </div>

        {/* Back to Blog */}
        <div className="mt-12 pt-8 border-t">
          <Link href={`/${locale}/blog`}>
            <Button variant="outline">{t('backToBlog')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

