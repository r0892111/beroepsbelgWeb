import type { Metadata } from 'next';
import { type Locale, locales } from '@/i18n';

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Pers | BeroepsBelg - In de Media',
    description: 'Bekijk BeroepsBelg in de media. Van CNN tot lokale kranten, ontdek waar wij zijn verschenen en lees over onze unieke stadswandelingen.',
  },
  en: {
    title: 'Press | BeroepsBelg - In the Media',
    description: 'See BeroepsBelg in the media. From CNN to local newspapers, discover where we have appeared and read about our unique city tours.',
  },
  fr: {
    title: 'Presse | BeroepsBelg - Dans les Médias',
    description: 'Découvrez BeroepsBelg dans les médias. De CNN aux journaux locaux, découvrez où nous sommes apparus.',
  },
  de: {
    title: 'Presse | BeroepsBelg - In den Medien',
    description: 'Sehen Sie BeroepsBelg in den Medien. Von CNN bis zu lokalen Zeitungen, entdecken Sie wo wir erschienen sind.',
  },
};

interface PressLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/pers`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/pers`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/pers`,
      languages,
    },
  };
}

export default function PressLayout({ children }: PressLayoutProps) {
  return <>{children}</>;
}
