'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/i18n';
import { cities } from '@/lib/data/cities';
import { tours } from '@/lib/data/tours';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface RefinedCitySectionProps {
  locale: Locale;
}

export function RefinedCitySection({ locale }: RefinedCitySectionProps) {
  const t = useTranslations('home.cities');
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const liveCities = useMemo(() => cities.filter(city => city.status === 'live'), []);

  const cityTourCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    liveCities.forEach(city => {
      counts[city.slug] = tours.filter(tour => tour.citySlug === city.slug).length;
    });
    return counts;
  }, [liveCities]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = cardRefs.current.indexOf(entry.target as HTMLAnchorElement);
          if (entry.isIntersecting && index !== -1) {
            setVisibleCards((prev) => new Set(prev).add(index));
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 bg-sand relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brass/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-navy/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brass/50 to-transparent" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span
              className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4 relative"
              style={{ color: 'var(--brass)' }}
            >
              <span className="relative z-10">{t('kicker')}</span>
              <span className="absolute inset-0 bg-brass/10 blur-xl" />
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6">
              {t('title')}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--slate-blue)' }}>
              {t('description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {liveCities.map((city, index) => {
              const tourCount = cityTourCounts[city.slug];
              const isVisible = visibleCards.has(index);

              return (
                <Link
                  key={city.slug}
                  ref={(el) => { cardRefs.current[index] = el; }}
                  href={`/${locale}/tours-${city.slug}`}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`card-elevated group block overflow-hidden transition-all duration-700 hover:-translate-y-3 hover:shadow-2xl perspective-card ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {city.image && (
                    <div className="relative h-64 w-full overflow-hidden">
                      <Image
                        src={city.image}
                        alt={city.name[locale]}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="absolute inset-0 bg-gradient-to-br from-brass/0 via-brass/0 to-brass/30 opacity-0 group-hover:opacity-100 transition-all duration-500" />

                      <div className="absolute inset-0 border-2 border-brass/0 group-hover:border-brass/50 transition-all duration-500 rounded" />
                    </div>
                  )}

                  <div className="p-8 relative bg-white">
                    <div className="absolute top-0 left-0 w-0 h-1 bg-gradient-to-r from-brass via-brass/50 to-transparent group-hover:w-full transition-all duration-700" />

                    <div className="brass-corner pb-6">
                      <h3 className="text-2xl font-serif font-bold text-navy mb-3 group-hover:text-brass transition-colors duration-300 flex items-center gap-2">
                        <span>{city.name[locale]}</span>
                        <svg className="w-5 h-5 transform translate-x-0 group-hover:translate-x-2 transition-transform duration-300 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </h3>
                    </div>

                    <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--slate-blue)' }}>
                      {city.teaser[locale]}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-sand/50">
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--brass)' }}>
                        <MapPin className="w-4 h-4" />
                        <span className="font-semibold">{tourCount} tours beschikbaar</span>
                      </div>

                      <div className="flex items-center text-brass opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <span className="text-sm font-semibold mr-1">Ontdek</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 border border-transparent group-hover:border-brass/20 transition-colors duration-300 pointer-events-none rounded" />
                </Link>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/tours`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-navy text-ivory rounded-full font-semibold transition-all duration-300 hover:bg-brass hover:text-navy hover:shadow-xl hover:scale-105 group"
            >
              <span>Bekijk alle tours</span>
              <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brass/50 to-transparent" />
    </section>
  );
}
