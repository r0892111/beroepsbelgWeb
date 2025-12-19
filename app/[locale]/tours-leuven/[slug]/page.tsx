import { type Locale } from '@/i18n';
import { getTourBySlug, getTours } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Facebook, Twitter, Mail, MapPin, Clock, Languages, Bike } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TourImageGallery } from '@/components/tours/tour-image-gallery';
import { TourBookingButton } from '@/components/tours/tour-booking-button';
import { LocalToursBooking } from '@/components/tours/local-tours-booking';

interface TourDetailPageProps {
  params: { locale: Locale; slug: string };
}

export async function generateStaticParams() {
  const tours = await getTours('leuven');
  return tours.map((tour) => ({
    slug: tour.slug,
  }));
}

const formatDuration = (minutes: number, t: any) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    const hourText = hours === 1 ? t('hour') : t('hours');
    const minText = mins === 1 ? t('minute') : t('minutes');
    return `${hours} ${hourText} ${mins} ${minText}`;
  }
  if (hours > 0) {
    const hourText = hours === 1 ? t('hour') : t('hours');
    return `${hours} ${hourText}`;
  }
  const minText = mins === 1 ? t('minute') : t('minutes');
  return `${mins} ${minText}`;
};

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { locale, slug } = params;
  const tour = await getTourBySlug('leuven', slug);

  if (!tour) {
    notFound();
  }

  const t = await getTranslations('common');
  const tTour = await getTranslations('tourDetail');

  return (
    <div className="bg-ivory min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <Link
              href={`/${locale}/tours-leuven`}
              className="text-sm font-semibold transition-colors hover:opacity-70"
              style={{ color: 'var(--brass)' }}
            >
              ← {tTour('backToCity', { city: 'Leuven' })}
            </Link>
          </div>

          <div className="mb-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy">{tour.title}</h1>
              <div className="flex items-center gap-2">
                {tour.type === 'bike' && (
                  <Badge variant="outline" className="flex items-center gap-1 border-brass text-navy">
                    <Bike className="h-4 w-4" />
                    {tTour('bikeTour')}
                  </Badge>
                )}
                {tour.op_maat && (
                  <Badge
                    className="text-sm font-semibold"
                    style={{ backgroundColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
                  >
                    Op Maat
                  </Badge>
                )}
              </div>
            </div>
            {tour.price && (
              <p className="text-3xl font-serif font-bold" style={{ color: 'var(--brass)' }}>
                €{tour.price.toFixed(2)}
              </p>
            )}
          </div>

        <div className="mb-12 space-y-6">
          {tour.description && (
            <div className="prose max-w-none">
              {tour.description.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-base leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {tour.notes && (
            <p className="text-sm italic" style={{ color: 'var(--brass)' }}>{tour.notes}</p>
          )}
        </div>

        <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
          <h3 className="text-2xl font-serif font-bold text-navy mb-6">{tTour('details')}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {tour.startLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('start')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.startLocation}</p>
                </div>
              </div>
            )}
            {tour.endLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('end')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.endLocation}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
              <div>
                <p className="font-semibold text-navy mb-1">{tTour('duration')}</p>
                <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{formatDuration(tour.durationMinutes, t)}</p>
              </div>
            </div>
            {tour.languages.length > 0 && (
              <div className="flex items-start gap-3">
                <Languages className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('languages')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.languages.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {tour.local_stories && (
          <LocalToursBooking 
            tourId={tour.id} 
            tourTitle={tour.title}
            tourPrice={tour.price || 0}
            tourDuration={tour.durationMinutes}
            citySlug="leuven"
          />
        )}

        {tour.price && !tour.local_stories && (
          <div className="mb-12">
            <TourBookingButton
              tourId={tour.id}
              tourTitle={tour.title}
              tourPrice={tour.price}
              tourDuration={tour.durationMinutes}
              isLocalStories={false}
              opMaat={tour.op_maat}
              citySlug="leuven"
            />
          </div>
        )}

        <div className="pt-8" style={{ borderTop: '1px solid var(--brass)' }}>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-serif font-semibold text-navy">
            <Share2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
            {t('share')}
          </h3>
          <div className="flex gap-4">
            <Button variant="outline" size="icon" className="border-brass hover:bg-brass hover:text-navy transition-all">
              <Facebook className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-brass hover:bg-brass hover:text-navy transition-all">
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-brass hover:bg-brass hover:text-navy transition-all">
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
