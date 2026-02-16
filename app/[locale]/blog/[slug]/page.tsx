import { getTranslations } from 'next-intl/server';
import { type Locale, locales } from '@/i18n';
import { getBlogBySlug, getTours } from '@/lib/api/content';
import { notFound } from 'next/navigation';
import BlogDetailClientPage from './client-page';
import type { Metadata } from 'next';
import { ArticleJsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://beroepsbelg.be';

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

  const url = `${BASE_URL}/${locale}/blog/${slug}`;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/blog/${slug}`;
  });

  return {
    title: blog.meta_title || `${title} | Beroepsbelg`,
    description: blog.meta_description || excerpt,
    openGraph: {
      title: blog.meta_title || title,
      description: blog.meta_description || excerpt,
      url,
      siteName: 'BeroepsBelg',
      type: 'article',
      publishedTime: blog.published_at,
      modifiedTime: blog.updated_at,
      authors: blog.author ? [blog.author] : undefined,
      images: blog.og_image_url || blog.thumbnail_url ? [blog.og_image_url || blog.thumbnail_url!] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.meta_title || title,
      description: blog.meta_description || excerpt,
      images: blog.og_image_url || blog.thumbnail_url ? [blog.og_image_url || blog.thumbnail_url!] : [],
    },
    alternates: {
      canonical: url,
      languages,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { locale, slug } = params;
  const [blog, tours] = await Promise.all([
    getBlogBySlug(slug, locale),
    getTours(), // Fetch all tours for related tours section
  ]);

  if (!blog) {
    notFound();
  }

  // Get localized title and excerpt for JSON-LD
  let title = blog.title;
  if (locale === 'en' && blog.title_en) title = blog.title_en;
  else if (locale === 'fr' && blog.title_fr) title = blog.title_fr;
  else if (locale === 'de' && blog.title_de) title = blog.title_de;

  let excerpt = blog.excerpt || '';
  if (locale === 'en' && blog.excerpt_en) excerpt = blog.excerpt_en;
  else if (locale === 'fr' && blog.excerpt_fr) excerpt = blog.excerpt_fr;
  else if (locale === 'de' && blog.excerpt_de) excerpt = blog.excerpt_de;

  const url = `${BASE_URL}/${locale}/blog/${slug}`;

  // Try to extract city from blog content or metadata for related tours
  // This is a simple implementation - you could enhance it with better city detection
  // For now, we'll pass undefined and show general tours
  const citySlug = undefined;

  return (
    <>
      <ArticleJsonLd
        title={title}
        description={blog.meta_description || excerpt}
        image={blog.og_image_url || blog.thumbnail_url}
        datePublished={blog.published_at}
        dateModified={blog.updated_at}
        author={blog.author}
        url={url}
      />
      <BlogDetailClientPage blog={blog} locale={locale} tours={tours} citySlug={citySlug} />
    </>
  );
}

