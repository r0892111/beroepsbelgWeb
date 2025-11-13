import { type Locale } from '@/i18n';
import { tours } from '@/lib/data';
import { TourCard } from '@/components/tours/tour-card';

interface ToursAntwerpPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function ToursAntwerpPage({ params }: ToursAntwerpPageProps) {
  const { locale } = await params;
  const antwerpTours = tours.filter((tour) => tour.citySlug === 'antwerpen');

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">
        Tours Antwerpen
      </h1>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {antwerpTours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} locale={locale} />
        ))}
      </div>
    </div>
  );
}
