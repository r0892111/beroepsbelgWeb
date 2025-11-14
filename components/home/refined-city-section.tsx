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
    <section className="py-24 bg-gradient-to-b from-soft-cream to-warm-sand/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-coral/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-sage/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-golden-amber to-warm-terracotta bg-clip-text text-transparent">
              {t('kicker')}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6">
              {t('title')}
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-slate">
              {t('description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cities.filter(city => city.status === 'live').map((city, index) => {
              const tourCount = getCityTourCount(city.slug);
              return (
                <Link
                  key={city.slug}
                  href={`/${locale}/tours-${city.slug}`}
                  className={`card-elevated group p-8 block relative overflow-hidden opacity-0 animate-fade-in-up stagger-${index + 1}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-golden-amber/0 to-warm-terracotta/0 group-hover:from-golden-amber/5 group-hover:to-warm-terracotta/5 transition-all duration-500" />

                  <div className="brass-corner pb-6 relative z-10">
                    <h3 className="text-2xl font-serif font-bold text-navy mb-3 group-hover:bg-gradient-to-r group-hover:from-deep-teal group-hover:to-belgian-navy group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {city.name[locale]}
                    </h3>
                    {tourCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-golden-amber/10 rounded-full">
                        <span className="text-sm font-medium text-golden-amber">
                          {tourCount} {tourCount === 1 ? 'tour' : 'tours'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-base leading-relaxed text-slate relative z-10 group-hover:text-charcoal transition-colors">
                    {city.teaser[locale]}
                  </p>

                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-golden-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
