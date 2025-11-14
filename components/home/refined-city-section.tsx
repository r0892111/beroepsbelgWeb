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
    <section className="py-24 bg-gradient-to-b from-soft-cream via-white to-accent-lime/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-vibrant-coral/15 to-accent-pink/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-ocean-blue/15 to-mint-green/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-br from-royal-purple/10 to-electric-gold/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-sunset-orange via-vibrant-coral to-accent-pink bg-clip-text text-transparent">
              {t('kicker')}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-belgian-navy via-royal-purple to-ocean-blue bg-clip-text text-transparent mb-6">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/0 to-royal-purple/0 group-hover:from-ocean-blue/8 group-hover:to-royal-purple/8 transition-all duration-500" />

                  <div className="brass-corner pb-6 relative z-10">
                    <h3 className="text-2xl font-serif font-bold text-navy mb-3 group-hover:bg-gradient-to-r group-hover:from-ocean-blue group-hover:via-royal-purple group-hover:to-vibrant-coral group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {city.name[locale]}
                    </h3>
                    {tourCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-electric-gold/20 to-sunset-orange/20 rounded-full border border-electric-gold/30">
                        <span className="text-sm font-bold bg-gradient-to-r from-sunset-orange to-vibrant-coral bg-clip-text text-transparent">
                          {tourCount} {tourCount === 1 ? 'tour' : 'tours'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-base leading-relaxed text-slate relative z-10 group-hover:text-charcoal transition-colors">
                    {city.teaser[locale]}
                  </p>

                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint-green to-ocean-blue flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
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
