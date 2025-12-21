import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';

interface ToursGhentPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function ToursGhentPage({ params }: ToursGhentPageProps) {
  const { locale } = await params;
  const gentTours = await getTours('gent');

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours Gent
      </h1>
      {gentTours.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {gentTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
      )}
    </div>
  );
}
