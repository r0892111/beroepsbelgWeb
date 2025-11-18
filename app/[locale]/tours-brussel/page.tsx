import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';

interface ToursBrusselsPageProps {
  params: { locale: Locale };
}

export default async function ToursBrusselsPage({ params }: ToursBrusselsPageProps) {
  const { locale } = params;
  const brusselsTours = await getTours('brussel');

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours Brussel
      </h1>
      {brusselsTours.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {brusselsTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
      )}
    </div>
  );
}
