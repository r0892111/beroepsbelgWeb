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
      counts[city.slug] = tours.filter(tour => tour.city === city.slug).length;
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
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
                  className={`group flex flex-col h-full overflow-hidden relative bg-white ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                    borderRadius: '20px',
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    willChange: 'transform, box-shadow'
                  }}
                >
                  {/* Multi-layered glow effect for depth */}
                  <div
                    className="absolute -inset-[2px] rounded-[22px] opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, var(--green-accent), transparent 70%)`,
                      filter: 'blur(20px)'
                    }}
                  />
                  <div
                    className="absolute -inset-[1px] rounded-[21px] opacity-0 group-hover:opacity-60 -z-10 transition-opacity duration-700"
                    style={{
                      background: `linear-gradient(135deg, var(--green-accent), transparent)`,
                      filter: 'blur(12px)'
                    }}
                  />

                  {/* Image container with enhanced hover */}
                  {city.image && (
                    <div
                      className="relative w-full overflow-hidden rounded-t-[20px] bg-gray-100"
                      style={{
                        height: '280px',
                        transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      {/* Animated corner accent with better timing */}
                      <div
                        className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-all duration-600"
                        style={{
                          width: '80px',
                          height: '80px',
                          background: `linear-gradient(135deg, transparent 50%, var(--green-accent) 50%)`,
                          clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                          transitionDelay: '100ms'
                        }}
                      />

                      {/* Image with improved zoom */}
                      <Image
                        src={city.image}
                        alt={city.name[locale]}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        style={{
                          transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s ease-out',
                          transform: 'scale(1)',
                          filter: 'brightness(1)'
                        }}
                      />

                      {/* Sophisticated gradient overlays */}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent opacity-0 group-hover:opacity-100"
                        style={{ transition: 'opacity 0.6s ease-out' }}
                      />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-[0.15]"
                        style={{
                          backgroundColor: 'var(--green-accent)',
                          mixBlendMode: 'multiply',
                          transition: 'opacity 0.6s ease-out'
                        }}
                      />

                      {/* Shine effect on hover */}
                      <div
                        className="shine-effect absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
                          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                          transform: 'translateX(-100%)'
                        }}
                      />
                    </div>
                  )}

                  {/* Content area with refined spacing */}
                  <div className="relative flex flex-col flex-1 p-6 md:p-7 bg-white rounded-b-[20px]">
                    {/* City name with refined animation */}
                    <h3
                      className="text-2xl md:text-3xl font-bold mb-3 relative"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        color: 'var(--text-primary)',
                        transition: 'color 0.4s ease-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      {city.name[locale]}
                      {/* Underline accent */}
                      <div
                        className="absolute -bottom-1 left-0 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-[var(--green-accent)] to-transparent"
                        style={{ transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                      />
                    </h3>

                    {/* Description */}
                    <p
                      className="text-base leading-relaxed mb-5 flex-1"
                      style={{
                        fontFamily: 'Open Sans, sans-serif',
                        color: 'var(--text-secondary)',
                        transition: 'color 0.3s ease-out'
                      }}
                    >
                      {city.teaser[locale]}
                    </p>

                    {/* Footer section with refined border */}
                    <div className="relative pt-4 mt-auto">
                      {/* Animated border */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-full"
                        style={{ backgroundColor: 'rgba(61, 213, 152, 0.15)' }}
                      >
                        <div
                          className="absolute inset-0 w-0 group-hover:w-full h-full rounded-full"
                          style={{
                            backgroundColor: 'var(--green-accent)',
                            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 0 12px var(--green-accent)'
                          }}
                        />
                      </div>

                      <div className="footer-section flex items-center justify-between">
                        {/* Tour count */}
                        <div
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            color: 'var(--green-accent)',
                            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        >
                          <div className="relative">
                            <MapPin
                              className="icon-map w-4 h-4"
                              style={{
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                              }}
                            />
                            <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-sm"
                              style={{
                                backgroundColor: 'var(--green-accent)',
                                transition: 'opacity 0.3s ease-out'
                              }}
                            />
                          </div>
                          <span className="font-semibold">{t('toursCount', { count: tourCount })}</span>
                        </div>

                        {/* View tours CTA */}
                        <div
                          className="flex items-center gap-2 text-sm font-semibold"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            color: 'var(--green-accent)',
                            transition: 'gap 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        >
                          <span>{t('viewTours')}</span>
                          <svg
                            className="arrow-icon w-5 h-5"
                            style={{
                              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
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
                      transform: translateY(-8px) !important;
                      box-shadow: 0 20px 60px rgba(61, 213, 152, 0.25), 0 8px 30px rgba(0, 0, 0, 0.12) !important;
                    }
                    a:hover img {
                      transform: scale(1.08) !important;
                      filter: brightness(1.05) !important;
                    }
                    a:hover h3 {
                      color: var(--green-accent) !important;
                      transform: translateX(4px) !important;
                    }
                    a:hover .shine-effect {
                      transform: translateX(100%) !important;
                    }
                    a:hover .icon-map {
                      transform: scale(1.15) rotate(5deg) !important;
                    }
                    a:hover .arrow-icon {
                      transform: translateX(6px) !important;
                    }
                    a:hover .footer-section {
                      gap: 0.75rem !important;
                      transform: scale(1.02) !important;
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
