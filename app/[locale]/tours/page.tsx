import { type Locale } from '@/i18n';
import { getCities } from '@/lib/api/content';
import AngledSection from '@/components/design-system/AngledSection';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

interface ToursPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function ToursPage({ params }: ToursPageProps) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const cities = await getCities();

  return (
    <AngledSection plane="left">
      <h1 className="mb-12 text-center text-4xl md:text-5xl font-bold">Tours</h1>
      <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <Card
            key={city.slug}
            className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
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
            <CardHeader className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <CardTitle>{city.name[locale]}</CardTitle>
                {city.status === 'coming-soon' && (
                  <Badge variant="secondary">{t('comingSoon')}</Badge>
                )}
              </div>
              <CardDescription className="line-clamp-3">{city.teaser[locale]}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
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
    </AngledSection>
  );
}
