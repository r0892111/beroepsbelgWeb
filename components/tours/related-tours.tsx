'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale, type Tour } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { getTourPlaceholder } from '@/lib/utils/placeholder-images';

interface RelatedToursProps {
  tours: Tour[];
  currentTourId: string;
  locale: Locale;
  city: string;
}

export function RelatedTours({ tours, currentTourId, locale, city }: RelatedToursProps) {
  // Filter out current tour and get up to 3 related tours from the same city
  const relatedTours = tours
    .filter(tour => tour.id !== currentTourId && tour.city === city)
    .slice(0, 3);

  if (relatedTours.length === 0) {
    return null;
  }

  const formatDuration = (minutes: number): string => {
    const hours = minutes / 60;
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  };

  return (
    <section className="mt-12 pt-8" style={{ borderTop: '1px solid var(--brass)' }}>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-navy mb-6">
        {locale === 'nl' 
          ? 'Gerelateerde Tours' 
          : locale === 'en' 
          ? 'Related Tours' 
          : locale === 'fr'
          ? 'Visites Similaires'
          : 'Ähnliche Touren'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedTours.map((tour) => {
          const imageUrl = tour.image || getTourPlaceholder(tour.city);
          const isVideo = tour.primaryMediaType === 'video' || (imageUrl && /\.(mp4|webm|mov)$/i.test(imageUrl));

          return (
            <Link
              key={tour.id}
              href={`/${locale}/tours/${tour.city}/${tour.slug}`}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="relative h-48 w-full overflow-hidden">
                  {isVideo ? (
                    <video
                      src={imageUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      aria-label={tour.title}
                    />
                  ) : (
                    <Image
                      src={imageUrl}
                      alt={tour.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg group-hover:text-[var(--primary-base)] transition-colors line-clamp-2">
                    {tour.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(tour.durationMinutes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span className="capitalize">{tour.city}</span>
                    </div>
                  </div>
                  {tour.price && (
                    <p className="mt-2 text-lg font-bold" style={{ color: 'var(--brass)' }}>
                      €{tour.price.toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
