import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';
import { notFound } from 'next/navigation';

interface ToursCityPageProps {
  params: Promise<{ locale: Locale; city: string }>;
}

export const dynamicParams = true;

export default async function ToursCityPage({ params }: ToursCityPageProps) {
  const { locale, city } = await params;
  
  // Validate city parameter
  if (!city || typeof city !== 'string') {
    notFound();
  }
  
  // First check if the city exists in the cities table
  const { getCities } = await import('@/lib/api/content');
  const cities = await getCities();
  const cityExists = cities.some(c => c.slug === city);
  
  console.log('[ToursCityPage] City check:', {
    city,
    cityExists,
    cities: cities.map(c => ({ slug: c.slug, name: c.name.nl }))
  });
  
  if (!cityExists) {
    console.warn('[ToursCityPage] City not found:', city);
    notFound();
  }
  
  const tours = await getTours(city);
  console.log('[ToursCityPage] Tours found:', {
    city,
    toursCount: tours.length,
    tours: tours.map(t => ({ title: t.title, city: t.city, slug: t.slug }))
  });

  // Show the page even if no tours exist (will show "coming soon" message)

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
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
          {tours.map((tour) => (
            <div key={tour.slug} className="break-inside-avoid mb-8">
              <TourCard tour={tour} locale={locale} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
      )}
    </div>
  );
}

