import type { Metadata } from 'next';
import { type Locale, locales } from '@/i18n';

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Teambuilding België | Bedrijfsuitje & Zakelijke Rondleidingen',
    description: 'Organiseer een unieke teambuilding in Antwerpen, Brussel, Brugge of Gent. Stadswandelingen voor bedrijven, personeelsfeesten en incentives. Vraag een offerte aan.',
  },
  en: {
    title: 'Team Building Belgium | Corporate Outings & Business Tours',
    description: 'Organize a unique team building in Antwerp, Brussels, Bruges or Ghent. City tours for companies, staff parties and incentives. Request a quote.',
  },
  fr: {
    title: 'Team Building Belgique | Sorties d\'Entreprise & Visites Professionnelles',
    description: 'Organisez un team building unique à Anvers, Bruxelles, Bruges ou Gand. Visites guidées pour entreprises, fêtes du personnel et incentives.',
  },
  de: {
    title: 'Teambuilding Belgien | Firmenausflüge & Geschäftstouren',
    description: 'Organisieren Sie ein einzigartiges Teambuilding in Antwerpen, Brüssel, Brügge oder Gent. Stadtführungen für Unternehmen, Betriebsfeiern und Incentives.',
  },
};

interface B2BLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/b2b-offerte`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/b2b-offerte`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/b2b-offerte`,
      languages,
    },
  };
}

export default function B2BLayout({ children }: B2BLayoutProps) {
  return <>{children}</>;
}
