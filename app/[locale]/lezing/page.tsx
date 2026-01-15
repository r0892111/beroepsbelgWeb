import { type Locale, locales } from '@/i18n';
import { getLectures } from '@/lib/api/content';
import LezingClientPage from './client-page';
import type { Metadata } from 'next';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Lezingen | BeroepsBelg - Boeiende Presentaties over België',
    description: 'Boek een boeiende lezing over de geschiedenis, architectuur en cultuur van België. Ideaal voor bedrijven, scholen en verenigingen.',
  },
  en: {
    title: 'Lectures | BeroepsBelg - Engaging Presentations about Belgium',
    description: 'Book an engaging lecture about the history, architecture and culture of Belgium. Ideal for companies, schools and associations.',
  },
  fr: {
    title: 'Conférences | BeroepsBelg - Présentations Captivantes sur la Belgique',
    description: 'Réservez une conférence captivante sur l\'histoire, l\'architecture et la culture de la Belgique. Idéal pour les entreprises et écoles.',
  },
  de: {
    title: 'Vorträge | BeroepsBelg - Fesselnde Präsentationen über Belgien',
    description: 'Buchen Sie einen fesselnden Vortrag über die Geschichte, Architektur und Kultur Belgiens. Ideal für Unternehmen und Schulen.',
  },
};

interface LezingPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: LezingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/lezing`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/lezing`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/lezing`,
      languages,
    },
  };
}

export default async function LezingPage({ params }: LezingPageProps) {
  const { locale } = await params;
  const lectures = await getLectures();

  return <LezingClientPage lectures={lectures} locale={locale} />;
}
