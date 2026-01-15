import { getTranslations } from 'next-intl/server';
import { type Locale, locales } from '@/i18n';
import { getBlogs } from '@/lib/api/content';
import BlogClientPage from './client-page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Blog | BeroepsBelg - Verhalen over België',
    description: 'Ontdek boeiende verhalen, tips en weetjes over Belgische steden, geschiedenis, architectuur en cultuur in onze blog.',
  },
  en: {
    title: 'Blog | BeroepsBelg - Stories about Belgium',
    description: 'Discover fascinating stories, tips and facts about Belgian cities, history, architecture and culture in our blog.',
  },
  fr: {
    title: 'Blog | BeroepsBelg - Histoires sur la Belgique',
    description: 'Découvrez des histoires fascinantes, des conseils et des faits sur les villes belges, l\'histoire, l\'architecture et la culture.',
  },
  de: {
    title: 'Blog | BeroepsBelg - Geschichten über Belgien',
    description: 'Entdecken Sie faszinierende Geschichten, Tipps und Fakten über belgische Städte, Geschichte, Architektur und Kultur.',
  },
};

interface BlogPageProps {
  params: { locale: Locale };
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/blog`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/blog`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/blog`,
      languages,
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = params;
  const blogs = await getBlogs(locale);

  return <BlogClientPage blogs={blogs} locale={locale} />;
}
