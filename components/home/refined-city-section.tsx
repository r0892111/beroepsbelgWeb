'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/i18n';
import { type City, type Tour } from '@/lib/data';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface RefinedCitySectionProps {
  locale: Locale;
  cities: City[];
  tours: Tour[];
}

export function RefinedCitySection({ locale, cities, tours }: RefinedCitySectionProps) {
  const t = useTranslations('home.cities');
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const liveCities = useMemo(() => {
    return cities.filter(city => city.status === 'live');
  }, [cities]);

  const cityTourCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    liveCities.forEach(city => {
      // Match tours to cities by city_id if available, otherwise by slug
      counts[city.slug] = tours.filter(tour => {
        const tourWithCityId = tour as any;
        const tourCityId = tourWithCityId.city_id;
        return tourCityId 
          ? tourCityId === city.id
          : tour.city === city.slug;
      }).length;
    });
    return counts;
  }, [liveCities, tours]);

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
  }, [liveCities]);

  return (
    <section className="py-20 md:py-32 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-dark)' }}>
      <div className="container mx-auto px-6 md:px-12 relative" style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20 relative">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
              {t('title') || 'Explore Belgian Cities'}
            </h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto font-light" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
              {t('description') || 'Discover authentic stories and hidden gems in Belgium\'s most captivating cities'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {liveCities.map((city, index) => {
              const tourCount = cityTourCounts[city.slug];
              const isVisible = visibleCards.has(index);

              return (
                <Link
                  key={city.slug}
                  ref={(el) => { cardRefs.current[index] = el; }}
                  href={`/${locale}/tours/${city.slug}`}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`group flex flex-col h-full overflow-hidden relative ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                    borderRadius: '20px',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    backgroundColor: 'var(--surface-elevated-1)',
                    boxShadow: 'var(--shadow-medium)'
                  }}
                >

                  {/* Image container with enhanced hover */}
                  {city.image && (
                    <div
                      className="relative w-full overflow-hidden rounded-t-[20px] bg-gray-100"
                      style={{ height: '280px' }}
                    >
                      <Image
                        src={city.image}
                        alt={city.name[locale]}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />

                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  )}

                  {/* Content area with refined spacing */}
                  <div className="relative flex flex-col flex-1 p-6 md:p-7 rounded-b-[20px]" style={{ backgroundColor: 'var(--surface-elevated-2)' }}>
                    <h3
                      className="text-2xl md:text-3xl font-bold mb-3 transition-colors duration-300 group-hover:text-[var(--primary-base)]"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {city.name[locale]}
                    </h3>

                    <p
                      className="text-base leading-relaxed mb-5 flex-1"
                      style={{
                        fontFamily: 'Open Sans, sans-serif',
                        color: 'var(--text-tertiary)'
                      }}
                    >
                      {city.teaser[locale]}
                    </p>

                    <div className="relative pt-4 mt-auto">
                      {/* Animated border expanding from center */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden" style={{ backgroundColor: 'var(--bg-dark)' }}>
                        <div
                          className="absolute top-0 left-1/2 h-full w-0 -translate-x-1/2 group-hover:w-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor: 'var(--primary-base)',
                            boxShadow: 'var(--shadow-glow-small)'
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            color: 'var(--primary-base)'
                          }}
                        >
                          <MapPin className="w-4 h-4" />
                          <span className="font-semibold">{t('toursCount', { count: tourCount })}</span>
                        </div>

                        <div
                          className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            color: 'var(--primary-base)'
                          }}
                        >
                          <span>{t('viewTours')}</span>
                          <svg
                            className="arrow-icon w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover styles via CSS */}
                  <style jsx>{`
                    a:hover {
                      transform: translateY(-6px) scale(1.01) !important;
                      box-shadow: var(--shadow-hover-glow) !important;
                    }
                  `}</style>
                </Link>
              );
            })}
          </div>

          <div className="mt-16 md:mt-20 text-center relative">
            <div className="inline-block relative group">
              {/* Animated turquoise glow */}
              <div
                className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Link
                href={`/${locale}/tours`}
                className="btn-primary relative inline-flex items-center gap-2 px-8 py-4 font-semibold text-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
                style={{
                  backgroundColor: 'var(--green-accent)',
                  color: 'white',
                  borderRadius: '9999px',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                {t('viewAllTours')}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
