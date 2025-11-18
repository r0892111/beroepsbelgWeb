import Link from 'next/link';
import Image from 'next/image';
import { type Locale, type Tour } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Bike } from 'lucide-react';

interface TourCardProps {
  tour: Tour;
  locale: Locale;
}

export function TourCard({ tour, locale }: TourCardProps) {
  const t = useTranslations('common');

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
      {tour.thumbnail && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={tour.thumbnail}
            alt={tour.title[locale]}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {tour.slug === 'het-jaar-2030' && (
            <div className="absolute top-3 right-3 bg-brass text-navy rounded-full p-2 shadow-lg">
              <Bike className="h-5 w-5" />
            </div>
          )}
        </div>
      )}
      <CardHeader className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <CardTitle className="text-lg">{tour.title[locale]}</CardTitle>
          {tour.badge && <Badge variant="secondary">{tour.badge}</Badge>}
        </div>
        <CardDescription className="line-clamp-2">{tour.shortDescription[locale]}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between gap-4">
        <span className="text-xl font-bold">
          {tour.price ? `€${tour.price.toFixed(2)}` : '\u00A0'}
        </span>
        <Button size="sm" asChild>
          <Link href={`/${locale}/tours-${tour.citySlug}/${tour.slug}`}>{t('moreInfo')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
