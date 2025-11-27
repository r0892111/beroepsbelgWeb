'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/i18n';
import { getCities, getTours, type City, type Tour } from '@/lib/data';
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
  const [cities, setCities] = useState<City[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    async function fetchData() {
      console.log('[RefinedCitySection] Starting data fetch...');
      const startTime = performance.now();

      try {
        const [citiesData, toursData] = await Promise.all([
          getCities(),
          getTours()
        ]);

        console.log('[RefinedCitySection] ✓ Data fetched successfully');
        console.log('[RefinedCitySection] Cities:', citiesData.length);
        console.log('[RefinedCitySection] Tours:', toursData.length);

        setCities(citiesData);
        setTours(toursData);

        const endTime = performance.now();
        console.log(`[RefinedCitySection] Total fetch time: ${(endTime - startTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[RefinedCitySection] ✖ Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const liveCities = useMemo(() => {
    const filtered = cities.filter(city => city.status === 'live');
    console.log(`[RefinedCitySection] Live cities: ${filtered.length}/${cities.length}`);
    return filtered;
  }, [cities]);

  const cityTourCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    liveCities.forEach(city => {
      counts[city.slug] = tours.filter(tour => tour.citySlug === city.slug).length;
    });
    console.log('[RefinedCitySection] Tour counts per city:', counts);
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
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-sand relative overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <div className="max-w-6xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="h-6 bg-navy/10 rounded w-32 mx-auto mb-4" />
              <div className="h-12 bg-navy/10 rounded w-64 mx-auto mb-6" />
              <div className="h-4 bg-navy/10 rounded w-96 mx-auto" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-32 relative" style={{ backgroundColor: 'white' }}>
      <div className="container mx-auto px-6 md:px-12 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
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
                  className={`group block overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {city.image && (
                    <div className="relative h-72 w-full overflow-hidden mb-6" style={{ backgroundColor: 'var(--beige)' }}>
                      <Image
                        src={city.image}
                        alt={city.name[locale]}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

                  <div className="relative">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3 transition-colors duration-200" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
                      {city.name[locale]}
                    </h3>

                    <p className="text-base leading-relaxed mb-4" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
                      {city.teaser[locale]}
                    </p>

                    <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                      <div className="flex items-center gap-2 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
                        <MapPin className="w-4 h-4" />
                        <span>{tourCount} tours</span>
                      </div>

                      <div className="flex items-center gap-1 text-sm font-medium transition-all duration-200 group-hover:gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
                        <span>View tours</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-16 md:mt-20 text-center">
            <Link
              href={`/${locale}/tours`}
              className="btn-primary"
            >
              View All Tours
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
