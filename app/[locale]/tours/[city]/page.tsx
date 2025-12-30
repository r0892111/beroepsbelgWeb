import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';
import { notFound } from 'next/navigation';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

interface ToursCityPageProps {
  params: Promise<{ locale: Locale; city: string }>;
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

