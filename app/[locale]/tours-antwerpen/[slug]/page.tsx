import { type Locale } from '@/i18n';
import { getTourBySlug, getTours } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Facebook, Twitter, Mail, MapPin, Clock, Languages, Bike } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TourImageGallery } from '@/components/tours/tour-image-gallery';

interface TourDetailPageProps {
  params: { locale: Locale; slug: string };
}

export async function generateStaticParams() {
  const antwerpTours = await getTours('antwerpen');
  return antwerpTours.map((tour) => ({
    slug: tour.slug,
  }));
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { locale, slug } = params;
  const tour = await getTourBySlug('antwerpen', slug);

  if (!tour) {
    notFound();
  }

  const t = await getTranslations('common');

  return (
    <div className="bg-ivory min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <Link
              href={`/${locale}/tours-antwerpen`}
              className="text-sm font-semibold transition-colors hover:opacity-70"
              style={{ color: 'var(--brass)' }}
            >
              ← Terug naar Antwerpen tours
            </Link>
          </div>

          <div className="mb-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy">{tour.title[locale]}</h1>
              <div className="flex items-center gap-2">
                {tour.slug === 'het-jaar-2030' && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 border-brass text-navy"
                  >
                    <Bike className="h-4 w-4" />
                    Fietstour
                  </Badge>
                )}
                {tour.badge && (
                  <Badge
                    className="text-sm font-semibold"
                    style={{ backgroundColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
                  >
                    {tour.badge}
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

        {tour.images && tour.images.length > 0 && (
          <TourImageGallery images={tour.images} title={tour.title[locale]} />
        )}

        <div className="mb-12 space-y-6">
          <p className="text-xl font-serif font-semibold text-navy">{tour.shortDescription[locale]}</p>
          {tour.description && (
            <div className="prose max-w-none">
              {tour.description[locale].split('\\n\\n').map((paragraph, idx) => {
                const hasFAQ = paragraph.includes('FAQ');
                if (hasFAQ) {
                  const parts = paragraph.split(/(FAQ-pagina|FAQ page|page FAQ|FAQ-Seite)/gi);
                  return (
                    <p key={idx} className="text-base leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
                      {parts.map((part, partIdx) => {
                        if (/FAQ-pagina|FAQ page|page FAQ|FAQ-Seite/i.test(part)) {
                          return (
                            <Link
                              key={partIdx}
                              href={`/${locale}/faq`}
                              className="font-semibold underline hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--brass)' }}
                            >
                              {part}
                            </Link>
                          );
                        }
                        return <span key={partIdx}>{part}</span>;
                      })}
                    </p>
                  );
                }
                return (
                  <p key={idx} className="text-base leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
                    {paragraph}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {tour.details && (
          <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
            <h3 className="text-2xl font-serif font-bold text-navy mb-6">Tour Details</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {tour.details.start && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                  <div>
                    <p className="font-semibold text-navy mb-1">Start</p>
                    <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.details.start[locale]}</p>
                  </div>
                </div>
              )}
              {tour.details.end && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                  <div>
                    <p className="font-semibold text-navy mb-1">Einde</p>
                    <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.details.end[locale]}</p>
                  </div>
                </div>
              )}
              {tour.details.duration && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                  <div>
                    <p className="font-semibold text-navy mb-1">Duurtijd</p>
                    <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.details.duration[locale]}</p>
                  </div>
                </div>
              )}
              {tour.details.languages && (
                <div className="flex items-start gap-3">
                  <Languages className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                  <div>
                    <p className="font-semibold text-navy mb-1">Talen</p>
                    <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.details.languages[locale]}</p>
                  </div>
                </div>
              )}
              {tour.details.extraInfo && (
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--brass)' }}>{tour.details.extraInfo[locale]}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-12">
          <Button
            size="lg"
            className="btn-primary px-8 py-6 text-lg font-semibold"
          >
            Reserveer deze tour
          </Button>
        </div>

        <div className="pt-8" style={{ borderTop: '1px solid var(--brass)' }}>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-serif font-semibold text-navy">
            <Share2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
            {t('share')}
          </h3>
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="icon"
              className="border-brass hover:bg-brass hover:text-navy transition-all"
            >
              <Facebook className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-brass hover:bg-brass hover:text-navy transition-all"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-brass hover:bg-brass hover:text-navy transition-all"
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
