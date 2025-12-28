'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale, type Tour } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Bike, Clock } from 'lucide-react';
import { getTourPlaceholder } from '@/lib/utils/placeholder-images';
import { TourBookingButton } from './tour-booking-button';

interface TourCardProps {
  tour: Tour;
  locale: Locale;
}

export function TourCard({ tour, locale }: TourCardProps) {
  const t = useTranslations('common');
  // Note: badge field removed with options field
  const badge = undefined;

  // Get image URL - use primary image if available, otherwise use placeholder
  const imageUrl = tour.image || getTourPlaceholder(tour.type, tour.city);

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  return (
    <Card
      className="group flex h-full flex-col overflow-hidden"
      style={{
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover-glow)';
        e.currentTarget.style.borderColor = 'var(--border-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      <Link href={`/${locale}/tours-${tour.city}/${tour.slug}`} className="relative h-48 w-full overflow-hidden block cursor-pointer">
          <Image
          src={imageUrl}
            alt={tour.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        {tour.type === 'Bike' && (
            <div
              className="absolute top-3 right-3 rounded-full p-2"
              style={{
                backgroundColor: 'var(--primary-base)',
                color: 'white',
                boxShadow: 'var(--shadow-medium)'
              }}
            >
              <Bike className="h-5 w-5" />
            </div>
          )}
      </Link>
      <CardHeader
        className="flex-1 flex flex-col justify-center"
        style={{
          backgroundColor: 'var(--card-header-bg)',
          borderBottom: '1px solid var(--border-light)',
          paddingTop: '1.75rem',
          paddingBottom: '1.75rem'
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <CardTitle
            className="text-lg"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              color: 'var(--text-primary)'
            }}
          >
            {tour.title}
          </CardTitle>
          {badge && (
            <Badge
              variant="secondary"
              style={{
                backgroundColor: 'var(--primary-lighter)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-small)'
              }}
            >
              {badge}
            </Badge>
          )}
        </div>
        <CardDescription
          className="line-clamp-2"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {tour.description}
        </CardDescription>
        {tour.themes && tour.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tour.themes.map((theme) => (
              <Badge
                key={theme}
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: '#1BDD95',
                  color: 'white',
                  border: 'none',
                }}
              >
                {theme}
              </Badge>
            ))}
          </div>
        )}
        <div
          className="flex items-center gap-1 text-sm mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <Clock className="h-4 w-4" />
          <span>{formatDuration(tour.durationMinutes)}</span>
        </div>
      </CardHeader>
      <CardFooter
        className="mt-auto flex flex-col gap-3 pt-6"
        style={{
          backgroundColor: 'var(--card-footer-bg)',
          borderTop: '1px solid var(--border-light)'
        }}
      >
        <span
          className="text-xl font-bold"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            color: 'var(--primary-base)'
          }}
        >
          {tour.price ? `€${tour.price.toFixed(2)}` : '\u00A0'}
        </span>
        <div className="flex items-center gap-2 w-full">
        <Button
          size="sm"
          asChild
            className="flex-1"
          style={{
            backgroundColor: 'var(--primary-base)',
            color: 'white',
            boxShadow: 'var(--shadow-small)'
          }}
        >
          <Link href={`/${locale}/tours-${tour.city}/${tour.slug}`}>{t('moreInfo')}</Link>
        </Button>
          {tour.local_stories ? (
            <Button
              size="sm"
              asChild
              className="flex-1"
              style={{
                backgroundColor: 'var(--primary-base)',
                color: 'white',
                boxShadow: 'var(--shadow-small)'
              }}
            >
              <Link href={`/${locale}/tours-${tour.city}/${tour.slug}`}>{t('schedule')}</Link>
            </Button>
          ) : (
            tour.price && tour.id && (
              <div className="flex-1">
                <TourBookingButton
                  tourId={tour.id}
                  tourTitle={tour.title}
                  tourPrice={tour.price}
                  tourDuration={tour.durationMinutes}
                  isLocalStories={tour.local_stories}
                  opMaat={tour.op_maat}
                  citySlug={tour.city}
                  size="sm"
                  className="w-full"
                />
              </div>
            )
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
