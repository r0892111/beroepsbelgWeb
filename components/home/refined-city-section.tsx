import Link from 'next/link';
import { type Locale } from '@/i18n';
import { cities } from '@/lib/data/cities';
import { tours } from '@/lib/data/tours';
import { useTranslations } from 'next-intl';

interface RefinedCitySectionProps {
  locale: Locale;
}

export function RefinedCitySection({ locale }: RefinedCitySectionProps) {
  const t = useTranslations('home.cities');

  const getCityTourCount = (citySlug: string) => {
    return tours.filter(tour => tour.citySlug === citySlug).length;
  };

  return (
    <section className="py-24 bg-sand">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span
              className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4"
              style={{ color: 'var(--brass)' }}
            >
              {t('kicker')}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6">
              {t('title')}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--slate-blue)' }}>
              {t('description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cities.filter(city => city.status === 'live').map((city) => {
              const tourCount = getCityTourCount(city.slug);
              return (
                <Link
                  key={city.slug}
                  href={`/${locale}/tours-${city.slug}`}
                  className="card-elevated group p-8 block"
                >
                  <div className="brass-corner pb-6">
                    <h3 className="text-2xl font-serif font-bold text-navy mb-3 group-hover:text-brass transition-colors">
                      {city.name[locale]}
                    </h3>
                    {tourCount > 0 && (
                      <p className="text-sm mb-4" style={{ color: 'var(--slate-blue)' }}>
                        {tourCount} {tourCount === 1 ? 'tour' : 'tours'}
                      </p>
                    )}
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
                    {city.teaser[locale]}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
