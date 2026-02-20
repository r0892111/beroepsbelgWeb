import { type Locale, locales } from '@/i18n';
import { getTourBySlug } from '@/lib/api/content';
import { getTourRatings } from '@/lib/api/tour-ratings';
import { Badge } from '@/components/ui/badge';
import { Share2, MapPin, Clock, Languages, Sparkles, Star, ExternalLink, Euro, Info } from 'lucide-react';
import type { Metadata } from 'next';
import { TouristTripJsonLd, BreadcrumbJsonLd, AggregateRatingJsonLd } from '@/components/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TourImageGallery } from '@/components/tours/tour-image-gallery';
import { TourBookingButton } from '@/components/tours/tour-booking-button';
import { LocalToursBooking } from '@/components/tours/local-tours-booking';
import { TourShareButtons } from '@/components/tours/tour-share-buttons';
import { TourFavoriteButton } from '@/components/tours/tour-favorite-button';
import { RelatedTours } from '@/components/tours/related-tours';
import { getBookingTypeShortLabel } from '@/lib/utils';
import { getTours } from '@/lib/api/content';

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

  // Optimize title for Antwerp tours with target keywords
  const isAntwerp = city === 'antwerpen' || city === 'antwerp';
  const title = isAntwerp
    ? locale === 'nl'
      ? `${tour.title} | Stadsgids Antwerpen - BeroepsBelg`
      : locale === 'en'
      ? `${tour.title} | Guide in Antwerp - BeroepsBelg`
      : `${tour.title} | BeroepsBelg Tours`
    : `${tour.title} | BeroepsBelg Tours`;
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
const formatDuration = (minutes: number): string => {
  const hours = minutes / 60;
  // Remove trailing .0 for whole hours
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
};

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { locale, city, slug } = await params;
  
  // Validate parameters
  if (!city || typeof city !== 'string' || !slug || typeof slug !== 'string') {
    notFound();
  }
  
  try {
    const tour = await getTourBySlug(city, slug);

    if (!tour) {
      notFound();
    }

    // Fetch all tours for related tours section and tour ratings
    const [allTours, tourRatings] = await Promise.all([
      getTours(city),
      getTourRatings(tour.id),
    ]);

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

  // Use base price (no discount)
  const originalPrice = tour.price || 0;
  const discountedPrice = originalPrice;

  // Format city name for display (capitalize first letter of each word)
  const cityDisplayName = city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Check if this is an Antwerp tour for SEO optimization
  const isAntwerp = city === 'antwerpen' || city === 'antwerp';

  // Prepare SEO-optimized image alt prefix for Antwerp tours
  const imageAltPrefix = isAntwerp
    ? locale === 'nl'
      ? `${tour.title} - Stadsgids Antwerpen`
      : locale === 'en'
      ? `${tour.title} - Guide in Antwerp`
      : tour.title
    : tour.title;

  // Prepare breadcrumb items
  const breadcrumbItems = [
    { name: locale === 'nl' ? 'Home' : locale === 'en' ? 'Home' : locale === 'fr' ? 'Accueil' : 'Startseite', url: `${BASE_URL}/${locale}` },
    { name: locale === 'nl' ? 'Tours' : locale === 'en' ? 'Tours' : locale === 'fr' ? 'Visites' : 'Touren', url: `${BASE_URL}/${locale}/tours` },
    { name: cityDisplayName, url: `${BASE_URL}/${locale}/tours/${city}` },
    { name: tour.title, url: `${BASE_URL}/${locale}/tours/${city}/${tour.slug}` },
  ];

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
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {/* Add AggregateRating schema with actual review data */}
      {tourRatings && tourRatings.reviewCount > 0 && (
        <AggregateRatingJsonLd
          ratingValue={tourRatings.ratingValue}
          reviewCount={tourRatings.reviewCount}
        />
      )}
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
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy">
                    {tour.title}
                    {isAntwerp && locale === 'nl' && ' - Stadsgids Antwerpen'}
                    {isAntwerp && locale === 'en' && ' - Guide in Antwerp'}
                  </h1>
                  {tour.id && <TourFavoriteButton tourId={tour.id} size="default" />}
                </div>
                
                {/* Tour Ratings */}
                {tourRatings && tourRatings.reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(tourRatings.ratingValue)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-navy">
                      {tourRatings.ratingValue.toFixed(1)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      ({tourRatings.reviewCount} {tourRatings.reviewCount === 1 ? tTour('review') : tTour('reviews')})
                    </span>
                  </div>
                )}

                {/* Tour Types badges */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {tour.tour_types && tour.tour_types.length > 0 ? (
                    tour.tour_types.map((tourType, index) => (
                      <Badge
                        key={`type-${index}`}
                        className="text-sm px-2 py-1"
                        style={{
                          backgroundColor: '#1BDD95',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        {getTourTypeText(tourType)}
                      </Badge>
                    ))
                  ) : tour.type && (
                    <Badge
                      className="text-sm px-2 py-1"
                      style={{
                        backgroundColor: '#1BDD95',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      {tour.type}
                    </Badge>
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
              
              {/* Price Section */}
              {tour.price && (
                <div className="flex flex-col gap-2 text-right">
                  <p className="text-3xl font-serif font-bold" style={{ color: 'var(--brass)' }}>
                    €{discountedPrice.toFixed(2)}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {tBooking('perPerson')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tour Images Gallery */}
          {((tour.tourImages && tour.tourImages.length > 0) || tour.image) && (
            <div className="mb-12">
              <TourImageGallery 
                images={tour.tourImages || []} 
                title={imageAltPrefix}
                fallbackImage={tour.image}
              />
            </div>
          )}

        {/* What to Expect Section */}
        <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
          <h2 className="text-2xl font-serif font-bold text-navy mb-4">
            {locale === 'nl' 
              ? 'Wat kun je verwachten?' 
              : locale === 'en' 
              ? 'What to Expect' 
              : locale === 'fr'
              ? 'À quoi s\'attendre'
              : 'Was Sie erwartet'}
          </h2>
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
        </div>

        {/* Notes Section - Separate if notes exist */}
        {tour.notes && (
          <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
            <h3 className="text-xl font-serif font-bold text-navy mb-3">{tTour('notes')}</h3>
            <p className="text-base leading-relaxed italic" style={{ color: 'var(--brass)' }}>
              {tour.notes}
            </p>
          </div>
        )}

        {/* Price Breakdown Section */}
        {tour.price && (
          <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
            <h3 className="text-2xl font-serif font-bold text-navy mb-6 flex items-center gap-2">
              <Euro className="h-6 w-6" style={{ color: 'var(--brass)' }} />
              {tTour('priceBreakdown')}
            </h3>
            
            <div className="space-y-4">
              {/* Base Price */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--brass)' }}>
                <div>
                  <p className="font-semibold text-navy">{tTour('basePrice')}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {tBooking('perPerson')}
                  </p>
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--brass)' }}>
                  €{tour.price.toFixed(2)}
                </p>
              </div>

              {/* Optional Fees Section */}
              <div className="pt-2">
                <p className="font-semibold text-navy mb-3">{tTour('optionalFees')}</p>
                <div className="space-y-3">
                  {/* Tanguy Availability - Only show if tour is eligible */}
                  {!tour.local_stories && ['antwerpen', 'knokke-heist', 'spa'].includes(city.toLowerCase()) && (
                    <div className="flex items-start justify-between p-3 rounded-lg bg-white/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-navy">{tTour('tanguyAvailable')}</p>
                          <Info className="h-4 w-4" style={{ color: 'var(--brass)' }} />
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {tTour('tanguyDescription')}
                        </p>
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                          {tBooking('tanguyLanguageDisclaimer')}
                        </p>
                      </div>
                      <p className="text-base font-semibold ml-4" style={{ color: 'var(--brass)' }}>
                        +€125.00
                      </p>
                    </div>
                  )}

                  {/* Extra Hour */}
                  {!tour.local_stories && (
                    <div className="flex items-start justify-between p-3 rounded-lg bg-white/50">
                      <div className="flex-1">
                        <p className="font-medium text-navy mb-1">{tTour('extraHour')}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {tTour('extraHourDescription')}
                        </p>
                      </div>
                      <p className="text-base font-semibold ml-4" style={{ color: 'var(--brass)' }}>
                        +€150.00
                      </p>
                    </div>
                  )}

                  {/* Weekend Fee */}
                  <div className="flex items-start justify-between p-3 rounded-lg bg-white/50">
                    <div className="flex-1">
                      <p className="font-medium text-navy mb-1">{tTour('weekendFee')}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {tTour('weekendFeeDescription')}
                      </p>
                    </div>
                    <p className="text-base font-semibold ml-4" style={{ color: 'var(--brass)' }}>
                      +€25.00
                    </p>
                  </div>

                  {/* Evening Fee */}
                  {tour.op_maat && (
                    <div className="flex items-start justify-between p-3 rounded-lg bg-white/50">
                      <div className="flex-1">
                        <p className="font-medium text-navy mb-1">{tTour('eveningFee')}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {tTour('eveningFeeDescription')}
                        </p>
                      </div>
                      <p className="text-base font-semibold ml-4" style={{ color: 'var(--brass)' }}>
                        +€25.00
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total with all options */}
              {(() => {
                const basePrice = tour.price;
                const tanguyCost = !tour.local_stories && ['antwerpen', 'knokke-heist', 'spa'].includes(city.toLowerCase()) ? 125 : 0;
                const extraHourCost = !tour.local_stories ? 150 : 0;
                const weekendFeeCost = 25;
                const eveningFeeCost = tour.op_maat ? 25 : 0;
                const totalWithAllOptions = basePrice + tanguyCost + extraHourCost + weekendFeeCost + eveningFeeCost;
                
                return (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t-2" style={{ borderColor: 'var(--brass)' }}>
                    <p className="text-lg font-semibold text-navy">{tTour('totalWithOptions')}</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--brass)' }}>
                      €{totalWithAllOptions.toFixed(2)}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
          <h3 className="text-2xl font-serif font-bold text-navy mb-6">{tTour('details')}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tour Type */}
            {(tour.tour_types && tour.tour_types.length > 0) || tour.type ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('tourType')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>
                    {tour.tour_types && tour.tour_types.length > 0
                      ? tour.tour_types.map((tourType) => getTourTypeText(tourType)).join(', ')
                      : tour.type}
                  </p>
                </div>
              </div>
            ) : null}
            
            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
              <div>
                <p className="font-semibold text-navy mb-1">{tTour('duration')}</p>
                <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{formatDuration(tour.durationMinutes)}</p>
              </div>
            </div>

            {/* Languages */}
            {tour.languages.length > 0 && (
              <div className="flex items-start gap-3">
                <Languages className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('languages')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.languages.map(translateLanguage).join(', ')}</p>
                </div>
              </div>
            )}

            {/* Start Location */}
            {tour.startLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('start')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.startLocation}</p>
                </div>
              </div>
            )}

            {/* End Location */}
            {tour.endLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div>
                  <p className="font-semibold text-navy mb-1">{tTour('end')}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>{tour.endLocation}</p>
                </div>
              </div>
            )}

            {/* Google Maps URL */}
            {tour.google_maps_url && (
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div className="flex-1">
                  <p className="font-semibold text-navy mb-1">{tTour('location')}</p>
                  <a
                    href={tour.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--brass)' }}
                  >
                    {tTour('viewOnGoogleMaps')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Themes */}
            {tour.themes && tour.themes.length > 0 && (
              <div className="flex items-start gap-3 md:col-span-2">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--brass)' }} />
                <div className="flex-1">
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
          <TourShareButtons
            shareUrl={`${BASE_URL}/${locale}/tours/${city}/${tour.slug}`}
            shareTitle={tour.title}
          />
        </div>

        {/* Related Tours Section */}
        <RelatedTours 
          tours={allTours} 
          currentTourId={tour.id} 
          locale={locale}
          city={city}
        />
          </div>
        </div>
      </div>
    </>
  );
  } catch {
    notFound();
  }
}

