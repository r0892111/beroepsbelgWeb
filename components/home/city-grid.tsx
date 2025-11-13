import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/i18n';
import { cities } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface CityGridProps {
  locale: Locale;
}

export function CityGrid({ locale }: CityGridProps) {
  const t = useTranslations('common');

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">Tours per stad</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <Card
              key={city.slug}
              className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              {city.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={city.image}
                    alt={city.name[locale]}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle>{city.name[locale]}</CardTitle>
                  {city.status === 'coming-soon' && (
                    <Badge variant="secondary">{t('comingSoon')}</Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-3">{city.teaser[locale]}</CardDescription>
              </CardHeader>
              <CardFooter>
                {city.status === 'live' ? (
                  <Button asChild className="w-full">
                    <Link href={`/${locale}/tours-${city.slug}`}>
                      {city.ctaText?.[locale] || t('discover')}
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    {t('comingSoon')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
