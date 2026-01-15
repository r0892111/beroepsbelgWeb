import { type Locale, locales } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

const BASE_URL = 'https://beroepsbelg.be';

// City name translations
const cityNames: Record<string, Record<Locale, string>> = {
  antwerpen: { nl: 'Antwerpen', en: 'Antwerp', fr: 'Anvers', de: 'Antwerpen' },
  brussel: { nl: 'Brussel', en: 'Brussels', fr: 'Bruxelles', de: 'Brüssel' },
  brugge: { nl: 'Brugge', en: 'Bruges', fr: 'Bruges', de: 'Brügge' },
  gent: { nl: 'Gent', en: 'Ghent', fr: 'Gand', de: 'Gent' },
  mechelen: { nl: 'Mechelen', en: 'Mechelen', fr: 'Malines', de: 'Mecheln' },
  leuven: { nl: 'Leuven', en: 'Leuven', fr: 'Louvain', de: 'Löwen' },
  hasselt: { nl: 'Hasselt', en: 'Hasselt', fr: 'Hasselt', de: 'Hasselt' },
  'knokke-heist': { nl: 'Knokke-Heist', en: 'Knokke-Heist', fr: 'Knokke-Heist', de: 'Knokke-Heist' },
};

interface ToursCityPageProps {
  params: Promise<{ locale: Locale; city: string }>;
}

export async function generateMetadata({ params }: ToursCityPageProps): Promise<Metadata> {
  const { locale, city } = await params;
  
  const cityName = cityNames[city]?.[locale] || city.charAt(0).toUpperCase() + city.slice(1);
  
  const title = locale === 'nl' 
    ? `Stadsgids ${cityName} | Rondleidingen & Stadswandelingen`
    : locale === 'en'
    ? `City Guide ${cityName} | Tours & Walking Tours`
    : locale === 'fr'
    ? `Guide de Ville ${cityName} | Visites Guidées`
    : `Stadtführer ${cityName} | Stadtführungen & Rundgänge`;

  const description = locale === 'nl'
    ? `Zoek je een stadsgids in ${cityName}? Boek professionele stadswandelingen en rondleidingen met een ervaren gids. Ontdek verborgen parels en unieke verhalen.`
    : locale === 'en'
    ? `Looking for a city guide in ${cityName}? Book professional city tours and walking tours with an experienced guide. Discover hidden gems and unique stories.`
    : locale === 'fr'
    ? `Vous cherchez un guide de ville à ${cityName}? Réservez des visites guidées professionnelles. Découvrez des trésors cachés et des histoires uniques.`
    : `Sie suchen einen Stadtführer in ${cityName}? Buchen Sie professionelle Stadtführungen. Entdecken Sie verborgene Schätze und einzigartige Geschichten.`;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/tours/${city}`;
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/tours/${city}`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/tours/${city}`,
      languages,
    },
  };
}

export default async function ToursCityPage({ params }: ToursCityPageProps) {
  const { locale, city } = await params;
  
  // Validate city parameter
  if (!city || typeof city !== 'string') {
    notFound();
  }
  
  const tours = await getTours(city);
  console.log(tours);

  // If no tours found for this city, show 404
  if (tours.length === 0) {
    notFound();
  }

  // Format city name for display (capitalize first letter of each word)
  const cityDisplayName = city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours {cityDisplayName}
      </h1>
      {tours.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
      )}
    </div>
  );
}

