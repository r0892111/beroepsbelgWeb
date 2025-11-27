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
      counts[city.slug] = tours.filter(tour => tour.citySlug === city.slug).length;
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
    <section className="py-20 md:py-32 relative overflow-hidden" style={{ backgroundColor: 'var(--white)' }}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 20s ease-in-out infinite'
          }}
        />
        <div
          className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 25s ease-in-out infinite reverse'
          }}
        />
        <div
          className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 30s ease-in-out infinite'
          }}
        />
      </div>

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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
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
                  className={`group flex flex-col h-full overflow-hidden transition-all duration-500 hover:shadow-2xl relative ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                    borderRadius: '12px'
                  }}
                >
                  {/* Turquoise glow on hover */}
                  <div
                    className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-lg"
                    style={{ backgroundColor: 'var(--green-accent)' }}
                  />

                  {city.image && (
                    <div className="relative h-72 w-full overflow-hidden mb-6 rounded-t-xl" style={{ backgroundColor: '#F5F5F5' }}>
                      {/* Turquoise corner accent */}
                      <div
                        className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-all duration-500"
                        style={{
                          background: `linear-gradient(135deg, transparent 50%, var(--green-accent) 50%)`,
                          clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
                        }}
                      />

                      <Image
                        src={city.image}
                        alt={city.name[locale]}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Animated turquoise overlay */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                        style={{ backgroundColor: 'var(--green-accent)' }}
                      />
                    </div>
                  )}

                  <div className="relative flex flex-col flex-1 px-6 pb-6 bg-white rounded-b-xl">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3 transition-all duration-300 group-hover:text-[var(--green-accent)] group-hover:translate-x-1" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
                      {city.name[locale]}
                    </h3>

                    <p className="text-base leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
                      {city.teaser[locale]}
                    </p>

                    <div
                      className="flex items-center justify-between pt-4 mt-auto relative"
                      style={{ borderTop: '3px solid var(--green-accent)' }}
                    >
                      {/* Animated border extension on hover */}
                      <div
                        className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--green-accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ width: '100%', transform: 'translateY(-3px)' }}
                      />

                      <div className="flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:scale-105" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--green-accent)' }}>
                        <div className="relative">
                          <MapPin className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                            style={{ backgroundColor: 'var(--green-accent)' }}
                          />
                        </div>
                        <span className="font-semibold">{tourCount} tours</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 group-hover:gap-3 group-hover:scale-105" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--green-accent)' }}>
                        <span>View tours</span>
                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
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
                View All Tours
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
