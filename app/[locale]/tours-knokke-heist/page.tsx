import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';

interface ToursKnokkeHeistPageProps {
  params: Promise<{ locale: Locale }>;
}

// Revalidate every 60 seconds to ensure fresh data
export const revalidate = 60;

export default async function ToursKnokkeHeistPage({ params }: ToursKnokkeHeistPageProps) {
  const { locale } = await params;
  const knokkeHeistTours = await getTours('knokke-heist');

  console.log('[Tours Page] Knokke-Heist tours fetched:', knokkeHeistTours);

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours Knokke-Heist
      </h1>
      {knokkeHeistTours.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {knokkeHeistTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
      )}
    </div>
  );
}
