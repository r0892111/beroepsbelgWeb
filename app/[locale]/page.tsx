import { type Locale, locales } from '@/i18n';
import { HeroSection } from '@/components/superdesign';
import { getCities, getTours, getProducts } from '@/lib/data';
import type { Metadata } from 'next';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Get base URL dynamically - works in production, staging, and localhost
function getBaseUrl(): string {
  // In production, use the production URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // Fallback to hardcoded production URL
  return 'https://beroepsbelg.be';
}

const BASE_URL = getBaseUrl();

const metadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Stadsgids Antwerpen | BeroepsBelg - Professionele Stadswandelingen',
    description: 'Zoek je een stadsgids in Antwerpen? BeroepsBelg biedt professionele stadswandelingen en rondleidingen in Antwerpen. Boek nu je stadsgids Antwerpen! "One of the 7 savviest guides in the world" — CNN.',
  },
  en: {
    title: 'Guide in Antwerp | BeroepsBelg - Professional City Tours',
    description: 'Looking for a guide in Antwerp? BeroepsBelg offers professional city tours and walking tours in Antwerp. Book your Antwerp guide today! "One of the 7 savviest guides in the world" — CNN.',
  },
  fr: {
    title: 'BeroepsBelg | Guide de Ville Belgique - Visites & Team Building',
    description: 'Guide de ville professionnel à Anvers, Bruxelles, Bruges, Gand et plus. Réservez des visites guidées, team building ou sorties d\'entreprise. "One of the 7 savviest guides in the world" — CNN.',
  },
  de: {
    title: 'BeroepsBelg | Stadtführer Belgien - Touren & Teambuilding',
    description: 'Professioneller Stadtführer in Antwerpen, Brüssel, Brügge, Gent und mehr. Buchen Sie Stadtführungen, Teambuilding oder Firmenausflüge. "One of the 7 savviest guides in the world" — CNN.',
  },
};

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const localeMetadata = metadata[locale] || metadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}`;
  });

  return {
    title: localeMetadata.title,
    description: localeMetadata.description,
    openGraph: {
      title: localeMetadata.title,
      description: localeMetadata.description,
      url: `${BASE_URL}/${locale}`,
      siteName: 'BeroepsBelg',
      locale: locale === 'nl' ? 'nl_BE' : locale === 'fr' ? 'fr_BE' : locale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${BASE_URL}/homepage-og-image.png`,
          width: 1200,
          height: 630,
          alt: 'BeroepsBelg',
        },
        // Fallback to logo if homepage image fails
        {
          url: `${BASE_URL}/Beroepsbelg Logo.png`,
          width: 1200,
          height: 630,
          alt: 'BeroepsBelg Logo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: localeMetadata.title,
      description: localeMetadata.description,
      images: [`${BASE_URL}/homepage-og-image.png`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages,
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const [cities, tours, products] = await Promise.all([
    getCities(),
    getTours(),
    getProducts()
  ]);

  const spotlightProducts = products.slice(0, 6);

  return (
    <div className="relative">
      <HeroSection locale={locale} />
    </div>
  );
}
