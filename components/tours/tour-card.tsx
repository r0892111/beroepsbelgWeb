import Link from 'next/link';
import Image from 'next/image';
import { type Locale, type Tour } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Bike, Clock } from 'lucide-react';

interface TourCardProps {
  tour: Tour;
  locale: Locale;
}

export function TourCard({ tour, locale }: TourCardProps) {
  const t = useTranslations('common');
  const thumbnail = tour.options?.thumbnail;
  const badge = tour.options?.badge;

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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
      }}
    >
      {thumbnail && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={thumbnail}
            alt={tour.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {tour.type === 'bike' && (
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
        </div>
      )}
      <CardHeader
        className="flex-1"
        style={{ backgroundColor: 'var(--bg-light)' }}
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
        <div
          className="flex items-center gap-1 text-sm mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <Clock className="h-4 w-4" />
          <span>{formatDuration(tour.durationMinutes)}</span>
        </div>
      </CardHeader>
      <CardFooter
        className="mt-auto flex items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--bg-base)' }}
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
        <Button
          size="sm"
          asChild
          style={{
            backgroundColor: 'var(--primary-base)',
            color: 'white',
            boxShadow: 'var(--shadow-small)'
          }}
        >
          <Link href={`/${locale}/tours-${tour.city}/${tour.slug}`}>{t('moreInfo')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
