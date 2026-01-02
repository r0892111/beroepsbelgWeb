import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';
import { getBlogBySlug } from '@/lib/api/content';
import { notFound } from 'next/navigation';
import BlogDetailClientPage from './client-page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BlogDetailPageProps {
  params: { locale: Locale; slug: string };
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { locale, slug } = params;
  const blog = await getBlogBySlug(slug, locale);

  if (!blog) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  // Get localized title
  let title = blog.title;
  if (locale === 'en' && blog.title_en) title = blog.title_en;
  else if (locale === 'fr' && blog.title_fr) title = blog.title_fr;
  else if (locale === 'de' && blog.title_de) title = blog.title_de;

  // Get localized excerpt for description
  let excerpt = blog.excerpt || '';
  if (locale === 'en' && blog.excerpt_en) excerpt = blog.excerpt_en;
  else if (locale === 'fr' && blog.excerpt_fr) excerpt = blog.excerpt_fr;
  else if (locale === 'de' && blog.excerpt_de) excerpt = blog.excerpt_de;

  return {
    title: blog.meta_title || `${title} | Beroepsbelg`,
    description: blog.meta_description || excerpt,
    openGraph: {
      title: blog.meta_title || title,
      description: blog.meta_description || excerpt,
      images: blog.og_image_url || blog.thumbnail_url ? [blog.og_image_url || blog.thumbnail_url!] : [],
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { locale, slug } = params;
  const blog = await getBlogBySlug(slug, locale);

  if (!blog) {
    notFound();
  }

  return <BlogDetailClientPage blog={blog} locale={locale} />;
}

