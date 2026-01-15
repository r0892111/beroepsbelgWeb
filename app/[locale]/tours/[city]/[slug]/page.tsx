import { type Locale, locales } from '@/i18n';
import { getTourBySlug } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Facebook, Instagram, MapPin, Clock, Languages, Bike, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { TouristTripJsonLd } from '@/components/seo/json-ld';

// Custom TikTok Icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    height="1em"
    width="1em"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TourImageGallery } from '@/components/tours/tour-image-gallery';
import { TourBookingButton } from '@/components/tours/tour-booking-button';
import { LocalToursBooking } from '@/components/tours/local-tours-booking';
import { getBookingTypeShortLabel } from '@/lib/utils';

interface TourDetailPageProps {
  params: Promise<{ locale: Locale; city: string; slug: string }>;
}

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

const BASE_URL = 'https://beroepsbelg.be';

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const { locale, city, slug } = await params;
  const tour = await getTourBySlug(city, slug);

  if (!tour) {
    return {
      title: 'Tour Not Found | BeroepsBelg',
    };
  }

  // Get localized description
  let description = tour.description || '';
  if (locale === 'en' && tour.description_en) description = tour.description_en;
  else if (locale === 'fr' && tour.description_fr) description = tour.description_fr;
  else if (locale === 'de' && tour.description_de) description = tour.description_de;

  // Truncate description for meta
  const metaDescription = description.length > 160 
    ? description.substring(0, 157).replace(/\n/g, ' ').trim() + '...'
    : description.replace(/\n/g, ' ').trim();

  const title = `${tour.title} | BeroepsBelg Tours`;
  const url = `${BASE_URL}/${locale}/tours/${city}/${slug}`;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/tours/${city}/${slug}`;
  });

  return {
    title,
    description: metaDescription,
    openGraph: {
      title,
      description: metaDescription,
      url,
      siteName: 'BeroepsBelg',
      type: 'website',
      images: tour.image ? [{ url: tour.image, alt: tour.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      images: tour.image ? [tour.image] : [],
    },
    alternates: {
      canonical: url,
      languages,
    },
  };
}

// Format duration from minutes to readable string
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
  const { locale, city, slug } = await params;
  
  // Validate parameters
  if (!city || typeof city !== 'string' || !slug || typeof slug !== 'string') {
    console.warn('[TourDetailPage] Invalid parameters:', { city, slug });
    notFound();
  }
  
  // Add logging for debugging
  console.log('[TourDetailPage] Looking for tour:', { city, slug, locale });
  
  try {
    const tour = await getTourBySlug(city, slug);

    if (!tour) {
      console.warn('[TourDetailPage] Tour not found:', { city, slug });
      notFound();
    }
    
    console.log('[TourDetailPage] Found tour:', { id: tour.id, title: tour.title, city: tour.city });

  const t = await getTranslations('common');
  const tTour = await getTranslations('tourDetail');
  const tBooking = await getTranslations('booking');
  const tB2b = await getTranslations('b2b');
  const tTourTypes = await getTranslations('tourTypes');

  // Helper to translate language names
  const translateLanguage = (lang: string) => {
    // Try to get translation, fall back to original name
    try {
      const translated = tB2b(`languageNames.${lang}`);
      return translated !== `languageNames.${lang}` ? translated : lang;
    } catch {
      return lang;
    }
  };

  // Helper to get tour type text in the correct language
  const getTourTypeText = (tourType: any): string => {
    // If it's a predefined key (string), use the translation
    if (typeof tourType === 'string') {
      try {
        const translated = tTourTypes(tourType as any);
        // If translation exists, return it
        if (translated && translated !== tourType) {
          return translated;
        }
      } catch {
        // Fall through to return the key
      }
      // Capitalize the key as fallback
      return tourType.charAt(0).toUpperCase() + tourType.slice(1);
    }

    // If it's a custom type (object), get the locale-specific text
    if (tourType && typeof tourType === 'object') {
      return tourType[locale] || tourType.nl || tourType.en || tourType.fr || tourType.de || '';
    }

    return String(tourType || '');
  };

  // Helper to get theme text in the correct language
  const getThemeText = (theme: any): string => {
    // Handle deeply nested JSON strings from database
    let themeObj = theme;
    while (typeof themeObj === 'string') {
      try {
        themeObj = JSON.parse(themeObj);
      } catch {
        return themeObj; // Plain string, return as-is (backward compatibility)
      }
    }
    if (!themeObj || typeof themeObj !== 'object') return String(themeObj || '');
    // Try to get the theme in the current locale, fall back to Dutch, then to any available
    return themeObj[locale] || themeObj.nl || themeObj.en || themeObj.fr || themeObj.de || '';
  };

  // Helper to get description in the correct language
  const getDescription = (): string => {
    if (locale === 'en' && tour.description_en) return tour.description_en;
    if (locale === 'fr' && tour.description_fr) return tour.description_fr;
    if (locale === 'de' && tour.description_de) return tour.description_de;
    return tour.description; // Default to Dutch
  };

  // Calculate discounted price (10% discount for online bookings)
  const discountRate = 0.9;
  const originalPrice = tour.price || 0;
  const discountedPrice = originalPrice * discountRate;

  // Format city name for display (capitalize first letter of each word)
  const cityDisplayName = city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <>
      <TouristTripJsonLd
        name={tour.title}
        description={getDescription()}
        image={tour.image}
        price={tour.price}
        duration={tour.durationMinutes}
        startLocation={tour.startLocation}
        city={cityDisplayName}
        url={`${BASE_URL}/${locale}/tours/${city}/${tour.slug}`}
        languages={tour.languages}
      />
      <div className="bg-ivory min-h-screen">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <Link
                href={`/${locale}/tours/${city}`}
                className="text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: 'var(--brass)' }}
              >
                ← {tTour('backToCity', { city: cityDisplayName })}
              </Link>
            </div>

          <div className="mb-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy">{tour.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tour Types badges */}
                {tour.tour_types && tour.tour_types.length > 0 && (
                  <>
                    {tour.tour_types.map((tourType, index) => {
                      const isBiking = tourType === 'biking' || (typeof tourType === 'object' && tourType.nl?.toLowerCase().includes('fiets'));
                      return (
                        <Badge
                          key={`type-${index}`}
                          className="text-sm px-2 py-1 flex items-center gap-1"
                          style={{
                            backgroundColor: '#1BDD95',
                            color: 'white',
                            border: 'none',
                          }}
                        >
                          {isBiking && <Bike className="h-4 w-4" />}
                          {getTourTypeText(tourType)}
                        </Badge>
                      );
                    })}
                  </>
                )}
                {tour.op_maat && (
                  <Badge
                    className="text-sm font-semibold"
                    style={{ backgroundColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
                  >
                    {getBookingTypeShortLabel(tour)}
                  </Badge>
                )}
                {tour.local_stories && (
                  <Badge
                    className="text-sm font-semibold"
                    style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}
                  >
                    {tTour('localStoriesTag')}
                  </Badge>
                )}
                {tour.themes && tour.themes.length > 0 && (
                  <>
                    {tour.themes.map((theme, index) => (
                      <Badge
                        key={`theme-${index}`}
                        className="text-sm px-2 py-1"
                        style={{
                          backgroundColor: '#1BDD95',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        {getThemeText(theme)}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
            {tour.price && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-serif font-bold" style={{ color: 'var(--brass)' }}>
                    €{discountedPrice.toFixed(2)}
                  </p>
                  <span className="text-xl line-through" style={{ color: 'var(--text-muted)' }}>
                    €{originalPrice.toFixed(2)}
                  </span>
                  <Badge
                    className="text-sm"
                    style={{
                      backgroundColor: 'var(--brass)',
                      color: 'white',
                    }}
                  >
                    -10%
                  </Badge>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {tBooking('onlineDiscount')}
                </p>
              </div>
            )}
          </div>

          {/* Tour Images Gallery */}
          {((tour.tourImages && tour.tourImages.length > 0) || tour.image) && (
            <div className="mb-12">
              <TourImageGallery 
                images={tour.tourImages || []} 
                title={tour.title}
                fallbackImage={tour.image}
              />
            </div>
          )}

        <div className="mb-12 space-y-6">
          {getDescription() && (
            <div className="prose max-w-none">
              {getDescription().split('\n\n').map((paragraph, idx) => {
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
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.languages.map(translateLanguage).join(', ')}</p>
                </div>
              </div>
            )}
            {tour.themes && tour.themes.length > 0 && (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('themes')}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tour.themes.map((theme, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: '#1BDD95',
                          color: 'white',
                        }}
                      >
                        {getThemeText(theme)}
                      </span>
                    ))}
                  </div>
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
            citySlug={city}
            tourLanguages={tour.languages}
          />
        )}

        {tour.price && !tour.local_stories && (
          <div className="mb-12">
            <TourBookingButton
              tourId={tour.id}
              tourTitle={tour.title}
              tourPrice={originalPrice}
              tourDuration={tour.durationMinutes}
              isLocalStories={false}
              opMaat={tour.op_maat}
              citySlug={city}
              tourLanguages={tour.languages}
            />
          </div>
        )}

        <div className="pt-8" style={{ borderTop: '1px solid var(--brass)' }}>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-serif font-semibold text-navy">
            <Share2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
            {t('share')}
          </h3>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/tanguyottomer/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="icon"
                className="border-brass hover:bg-brass hover:text-navy transition-all"
              >
                <Instagram className="h-4 w-4" />
              </Button>
            </a>
            <a
              href="https://www.facebook.com/tanguy.ottomer/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="icon"
                className="border-brass hover:bg-brass hover:text-navy transition-all"
              >
                <Facebook className="h-4 w-4" />
              </Button>
            </a>
            <a
              href="https://www.tiktok.com/@tanguyottomer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="icon"
                className="border-brass hover:bg-brass hover:text-navy transition-all"
              >
                <TikTokIcon className="h-4 w-4" />
              </Button>
            </a>
          </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
  } catch (error) {
    console.error('[TourDetailPage] Error fetching tour:', error);
    notFound();
  }
}

