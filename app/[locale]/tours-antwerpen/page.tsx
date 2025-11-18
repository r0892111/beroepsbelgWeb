import { type Locale } from '@/i18n';
import { getTours } from '@/lib/api/content';
import { TourCard } from '@/components/tours/tour-card';

interface ToursAntwerpPageProps {
  params: { locale: Locale };
}

export default async function ToursAntwerpPage({ params }: ToursAntwerpPageProps) {
  const { locale } = params;
  const antwerpTours = await getTours('antwerpen');

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours Antwerpen
      </h1>
      {antwerpTours.length === 0 ? (
        <p className="text-center text-muted-foreground">Er zijn momenteel geen tours beschikbaar voor Antwerpen.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {antwerpTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
