import { type Locale, locales } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CityJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';

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
  
  // Special handling for Antwerp to optimize for target keywords
  const isAntwerp = city === 'antwerpen' || city === 'antwerp';
  
  const title = locale === 'nl' 
    ? isAntwerp
      ? `Stadsgids Antwerpen | Rondleidingen & Stadswandelingen Antwerpen`
      : `Stadsgids ${cityName} | Rondleidingen & Stadswandelingen`
    : locale === 'en'
    ? isAntwerp
      ? `Guide in Antwerp | Antwerp City Tours & Walking Tours`
      : `City Guide ${cityName} | Tours & Walking Tours`
    : locale === 'fr'
    ? `Guide de Ville ${cityName} | Visites Guidées`
    : `Stadtführer ${cityName} | Stadtführungen & Rundgänge`;

  const description = locale === 'nl'
    ? isAntwerp
      ? `Zoek je een stadsgids in Antwerpen? BeroepsBelg biedt professionele stadswandelingen en rondleidingen in Antwerpen. Boek je stadsgids Antwerpen en ontdek de verborgen parels van de stad.`
      : `Zoek je een stadsgids in ${cityName}? Boek professionele stadswandelingen en rondleidingen met een ervaren gids. Ontdek verborgen parels en unieke verhalen.`
    : locale === 'en'
    ? isAntwerp
      ? `Looking for a guide in Antwerp? BeroepsBelg offers professional Antwerp city tours and walking tours. Book your guide in Antwerp and discover the city's hidden gems.`
      : `Looking for a city guide in ${cityName}? Book professional city tours and walking tours with an experienced guide. Discover hidden gems and unique stories.`
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

  // If no tours found for this city, show 404
  if (tours.length === 0) {
    notFound();
  }

  // Format city name for display (capitalize first letter of each word)
  const cityDisplayName = city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const cityName = cityNames[city]?.[locale] || cityDisplayName;
  const isAntwerp = city === 'antwerpen' || city === 'antwerp';

  // Prepare breadcrumb items
  const breadcrumbItems = [
    { name: locale === 'nl' ? 'Home' : locale === 'en' ? 'Home' : locale === 'fr' ? 'Accueil' : 'Startseite', url: `${BASE_URL}/${locale}` },
    { name: locale === 'nl' ? 'Tours' : locale === 'en' ? 'Tours' : locale === 'fr' ? 'Visites' : 'Touren', url: `${BASE_URL}/${locale}/tours` },
    { name: cityName, url: `${BASE_URL}/${locale}/tours/${city}` },
  ];

  // City descriptions for structured data
  const cityDescription = locale === 'nl'
    ? isAntwerp
      ? 'Ontdek Antwerpen met een professionele stadsgids. Stadswandelingen en rondleidingen in Antwerpen.'
      : `Ontdek ${cityName} met een professionele stadsgids. Stadswandelingen en rondleidingen.`
    : locale === 'en'
    ? isAntwerp
      ? 'Discover Antwerp with a professional guide. City tours and walking tours in Antwerp.'
      : `Discover ${cityName} with a professional guide. City tours and walking tours.`
    : locale === 'fr'
    ? `Découvrez ${cityName} avec un guide professionnel. Visites guidées de la ville.`
    : `Entdecken Sie ${cityName} mit einem professionellen Führer. Stadtführungen.`;

  return (
    <>
      {isAntwerp && (
        <CityJsonLd
          name={cityName}
          nameEn={cityNames[city]?.en}
          nameFr={cityNames[city]?.fr}
          nameDe={cityNames[city]?.de}
          description={cityDescription}
          url={`${BASE_URL}/${locale}/tours/${city}`}
          coordinates={city === 'antwerpen' ? { latitude: 51.2194, longitude: 4.4025 } : undefined}
        />
      )}
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section with Green Background */}
      <div className="bg-[#1BDD95] pt-10 md:pt-14 pb-32 md:pb-40 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-white">
            {isAntwerp && locale === 'nl'
              ? 'Stadsgids Antwerpen - Tours'
              : isAntwerp && locale === 'en'
              ? 'Guide in Antwerp - Tours'
              : `Tours ${cityDisplayName}`}
          </h1>
        </div>
      </div>

      {/* Tour Cards Section - overlaps the green */}
      <div className="px-4 md:px-8 -mt-24 md:-mt-32 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
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
      </div>
    </div>
    </>
  );
}

