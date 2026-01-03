'use client';

/**
 * The CitySection component - "The Modern Belgian"
 *
 * Design Philosophy:
 * A modern, cinematic reinvention of the classic wheel.
 * Separates "Atmosphere" (Background Sketch) from "Reality" (Foreground Photo).
 *
 * - Typography: Oswald (Headlines) + Inter (Body) for a clean, editorial look.
 * - Background: Solid Mint Green (#1BDD95) for a bold "Poster" aesthetic.
 * - Interaction: Preserves the original smooth rotation logic.
 */
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ArrowRight, ArrowLeft, MoveRight } from 'lucide-react';
import { ScrollDownIndicator } from './ScrollDownIndicator';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// City interface for the component
interface CityData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  photoUrl: string;
  sketchUrl?: string;
}

/**
 * The "Highlighter" Ring Component
 * Based on the reference image: a thick translucent green stroke + thin pencil arrows.
 * Updated: Now PURE WHITE for contrast on green.
 */
function HighlighterRing({ className }: { className?: string }) {
  // Use orange for desktop (lg), white for mobile (default)
  // We can't strictly detect media query here easily without hooks/classes, so we use CSS classes on the SVG or use currentColor
  // But SVG stroke prop takes a color string.
  // Let's use a class-based approach for stroke color

  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-full h-full overflow-visible', className)}
    >
      <motion.circle
        cx="200"
        cy="200"
        r="170"
        className="stroke-white fill-transparent"
        strokeWidth="15"
        strokeOpacity="1"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: 0.4, ease: 'easeOut' },
        }}
      />
    </svg>
  );
}

interface CitySectionProps {
  locale?: Locale;
}


export function CitySection({ locale = 'nl' }: CitySectionProps) {
  const t = useTranslations('citySection');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  // Initialize as false to match server-side render, will update after mount
  const [isMobile, setIsMobile] = useState(false);
  const [cityImagesMap, setCityImagesMap] = useState<Record<string, { photoUrl?: string }>>({});
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        
        // Fetch cities from database
        const { data: citiesData, error: citiesError } = await supabase
          .from('cities')
          .select('id, slug, name_nl, name_en, name_fr, name_de, teaser_nl, teaser_en, teaser_fr, teaser_de, image, status, display_order')
          .eq('status', 'live')
          .order('display_order', { ascending: true, nullsFirst: false });

        if (citiesError) {
          console.error('Error fetching cities:', citiesError);
          setLoading(false);
          return;
        }

        // Fetch city images from city_images table
        const { data: cityImagesData, error: imagesError } = await supabase
          .from('city_images')
          .select('city_id, photo_url');

        if (imagesError) {
          console.error('Error fetching city images:', imagesError);
        }

        const imagesMap: Record<string, { photoUrl?: string }> = {};
        (cityImagesData || []).forEach((row: any) => {
          if (row.photo_url) {
            imagesMap[row.city_id] = {
              photoUrl: row.photo_url,
            };
          }
        });

        setCityImagesMap(imagesMap);

        // Map database cities to component format
        const mappedCities: CityData[] = (citiesData || []).map((city: any) => {
          const cityName = city[`name_${locale}`] || city.name_nl || '';
          const cityTeaser = city[`teaser_${locale}`] || city.teaser_nl || '';
          
          // Use city_images photo if available, otherwise fall back to cities.image
          const photoUrl = imagesMap[city.id]?.photoUrl || city.image || '';

          return {
            id: city.slug || city.id, // Use slug for routing, fallback to id
            name: cityName,
            tagline: cityTeaser, // Using teaser as tagline
            description: cityTeaser, // Using teaser as description (can be updated if there's a separate description field)
            photoUrl: photoUrl,
            sketchUrl: undefined, // Sketch URLs can be added to database if needed
          };
        });

        setCities(mappedCities);
      } catch (err) {
        console.error('Exception fetching cities:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchCities();
  }, [locale]);

  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const wheelRadius = 450;
  const itemAngle = 30;

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (window.innerWidth < 1024) return;

      const currentIndex = activeIndexRef.current;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;
      const isAtStart = currentIndex === 0;
      const isAtEnd = currentIndex === cities.length - 1;

      if (isAtStart && isScrollingUp) return;
      if (isAtEnd && isScrollingDown) return;

      e.preventDefault();
      e.stopPropagation();

      if (scrollTimeout.current) return;
      if (Math.abs(e.deltaY) < 40) return;

      scrollTimeout.current = setTimeout(() => {
        scrollTimeout.current = null;
      }, 600);

      const nextIndex = isScrollingDown
        ? (currentIndex + 1) % cities.length
        : (currentIndex - 1 + cities.length) % cities.length;

      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    };

    const element = containerRef.current;
    if (element) element.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      if (element) element.removeEventListener('wheel', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [cities.length]);

  // Touch handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) setActiveIndex((prev) => (prev + 1) % cities.length);
      else setActiveIndex((prev) => (prev - 1 + cities.length) % cities.length);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // If loading or no cities, show loading state or empty
  if (loading || cities.length === 0) {
    return (
      <div className="relative w-full min-h-[900px] lg:h-[900px] h-auto overflow-hidden flex flex-col lg:flex-row items-center justify-center font-oswald rounded-t-[2.5rem] bg-[#1BDD95]">
        <div className="text-center text-neutral-900">
          {loading ? 'Loading cities...' : 'No cities available'}
        </div>
      </div>
    );
  }

  const activeCity = cities[activeIndex];
  // Get the city slug for the tours page link (use the city id which is already the slug)
  const citySlug = activeCity.id;
  const toursPageUrl = `/${locale}/tours/${citySlug}`;

  return (
    <div
      className="relative w-full min-h-[900px] lg:h-[900px] h-auto overflow-hidden flex flex-col lg:flex-row items-center justify-center font-oswald rounded-t-[2.5rem] bg-[#1BDD95]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* LAYER 1: Solid Mint Background, subtle noise */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="relative w-full h-full max-w-[1600px] mx-auto flex flex-col lg:flex-row z-10">

        {/* LEFT COLUMN: Wheel */}
        <div
          ref={containerRef}
          className="relative w-full lg:w-[60%] h-[350px] sm:h-[420px] md:h-[500px] lg:h-full flex items-center justify-center lg:block mt-8 md:mt-12 lg:mt-0 flex-shrink-0"
        >
          {/* ROTATING WHEEL CONTAINER */}
          <div
            className={clsx(
              'absolute left-1/2 -translate-x-1/2 lg:left-[-480px] lg:translate-x-0 -translate-y-1/2 w-[900px] h-[900px] rounded-full transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center',
              // Mobile spec from your mobile code
              'top-[650px] sm:top-[750px] scale-[0.35] md:scale-[0.5]',
              // Desktop spec from your desktop code
              'lg:top-1/2 lg:scale-100'
            )}
            style={{
              transform: `translate(${isMobile ? '-50%, -50%' : '0, -50%'}) rotate(${
                -activeIndex * itemAngle + (isMobile ? -90 : 0)
              }deg)`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
            suppressHydrationWarning
          >
            {cities.map((city, index) => {
              const angleInRad = index * itemAngle * (Math.PI / 180);
              // Round to 2 decimal places to avoid floating point precision issues
              const x = Math.round(Math.cos(angleInRad) * wheelRadius * 100) / 100;
              const y = Math.round(Math.sin(angleInRad) * wheelRadius * 100) / 100;

              const isActive = index === activeIndex;

              return (
                <div
                  key={city.id}
                  className={clsx(
                    'absolute top-1/2 left-1/2 flex items-center justify-center cursor-pointer group',
                    // Mobile item sizing from your mobile code
                    'w-[240px] h-[240px] -ml-[120px] -mt-[120px]',
                    // Desktop item sizing from your desktop code
                    'lg:w-[320px] lg:h-[320px] lg:-ml-[160px] lg:-mt-[160px]',
                    isActive ? 'z-50' : 'z-10'
                  )}
                  style={{
                    transform: `translate(${x}px, ${y}px) rotate(${activeIndex * itemAngle + (isMobile ? 90 : 0)}deg)`,
                  }}
                  suppressHydrationWarning
                  onClick={() => setActiveIndex(index)}
                >
                  <div
                    className={clsx(
                      'relative transition-all duration-500 rounded-full',
                      isActive ? 'scale-[1.35]' : 'scale-75 opacity-60 grayscale hover:opacity-90 hover:grayscale-0'
                    )}
                  >
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-[-10%] pointer-events-none z-0"
                        >
                          <HighlighterRing />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className={clsx(
                        'rounded-full overflow-hidden border-4 bg-white relative z-10',
                        // Mobile photo sizing from your mobile code
                        'w-[180px] h-[180px]',
                        // Desktop photo sizing from your desktop code
                        'lg:w-[260px] lg:h-[260px]',
                        isActive ? 'border-transparent shadow-none' : 'border-white shadow-2xl'
                      )}
                    >
                      <img
                        src={city.photoUrl}
                        alt={city.name}
                        className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-700"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Content Panel */}
        <div className="relative w-full lg:w-[40%] h-auto lg:h-full flex flex-col justify-start items-center lg:items-start text-center lg:text-left px-6 pb-20 lg:pb-0 lg:pl-4 lg:pr-16 lg:-ml-32 z-30 pointer-events-none mt-0 md:mt-0 lg:mt-0 lg:pt-[200px]">
          <div className="pointer-events-auto w-full max-w-lg lg:max-w-none mt-6 lg:mt-0">
            {/* Title + Arrows */}
            <div className="relative flex items-center justify-center lg:justify-start gap-4 md:gap-6 lg:gap-0 mb-4 lg:h-[180px]">
              {/* Previous Arrow - Absolute positioned on desktop for fixed placement */}
              <button
                onClick={() => setActiveIndex((prev) => (prev - 1 + cities.length) % cities.length)}
                className="w-10 h-10 lg:w-10 lg:h-10 rounded-full border border-neutral-900 flex items-center justify-center hover:bg-black hover:text-white transition-colors text-neutral-900 shrink-0 lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 z-10"
              >
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              {/* Title container with fixed width on desktop to prevent shifting */}
              <div className="w-[280px] sm:w-[400px] md:w-[500px] lg:w-[700px] xl:w-[800px] flex justify-center items-center relative lg:mx-12">
                <motion.h2
                  key={`title-${activeIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-6xl lg:text-[80px] xl:text-[100px] leading-[0.95] text-neutral-900 font-oswald font-bold tracking-tight uppercase text-center w-full"
                  suppressHydrationWarning
                >
                  {activeCity.name}
                </motion.h2>
              </div>

              {/* Next Arrow - Absolute positioned on desktop for fixed placement */}
              <button
                onClick={() => setActiveIndex((prev) => (prev + 1) % cities.length)}
                className="w-10 h-10 lg:w-10 lg:h-10 rounded-full border border-neutral-900 flex items-center justify-center hover:bg-black hover:text-white transition-colors text-neutral-900 shrink-0 lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 z-10"
              >
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>

            <motion.p
              key={`tag-${activeIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-2xl font-inter font-light text-neutral-800 mt-4 lg:mt-6 mb-6 md:mb-8 lg:border-l-4 lg:border-white lg:pl-6 tracking-wide"
              suppressHydrationWarning
            >
              {t(`${activeCity.id}.tagline`)}
            </motion.p>

            <motion.p
              key={`desc-${activeIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-neutral-800 leading-relaxed max-w-md mx-auto lg:mx-0 mb-4 md:mb-8 lg:mb-8 font-inter"
              suppressHydrationWarning
            >
              {t(`${activeCity.id}.description`)}
            </motion.p>
          </div>

          {/* Action Buttons: mobile spec + desktop spec */}
          <div
            className={clsx(
              'pointer-events-auto w-full flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6',
              // Mobile version from your mobile code
              'mt-2',
              // Desktop version from your desktop code
              'lg:mt-0 lg:static'
            )}
          >
            <div className="w-full md:w-[320px] flex-shrink-0">
              <Link 
                href={toursPageUrl} 
                className="group relative px-10 py-5 rounded-full text-neutral-900 font-oswald font-bold tracking-widest uppercase overflow-hidden transition-colors hover:bg-neutral-100 shadow-xl shadow-black/20 w-full bg-white flex items-center justify-center"
                style={{ minHeight: '3.5rem' }}
              >
                <div className="absolute inset-0 bg-neutral-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap">
                  {t('explore')} {activeCity.name} <MoveRight className="w-5 h-5 flex-shrink-0" />
                </span>
              </Link>
            </div>

            <div className="hidden lg:hidden gap-2 shrink-0">
              <button
                onClick={() => setActiveIndex((prev) => (prev - 1 + cities.length) % cities.length)}
                className="w-14 h-14 rounded-full border border-neutral-900 flex items-center justify-center hover:bg-black hover:text-white transition-all text-neutral-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setActiveIndex((prev) => (prev + 1) % cities.length)}
                className="w-14 h-14 rounded-full border border-neutral-900 flex items-center justify-center hover:bg-black hover:text-white transition-all text-neutral-900"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* MOBILE CITY INDEX (only mobile) */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pointer-events-auto w-full max-w-md mt-6 flex flex-wrap justify-center gap-2 px-4 pb-12"
            >
              {cities.map((city, index) => (
                <button
                  key={city.id}
                  onClick={() => setActiveIndex(index)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300',
                    activeIndex === index
                      ? 'bg-white border-white text-neutral-900 shadow-lg scale-105'
                      : 'border-neutral-900/20 text-neutral-800 hover:bg-neutral-900/5 hover:border-neutral-900/40'
                  )}
                >
                  {city.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Scroll Indicator: desktop version from your desktop code */}
        <div className="absolute bottom-4 md:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <ScrollDownIndicator
            label=""
            color="#000000"
            onClick={() => {
              const shopSection = document.getElementById('shop-section');
              if (shopSection) shopSection.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </div>

      {/* RIGHT SIDEBAR NAVIGATION (Desktop only) */}
      <div className="absolute right-0 top-0 h-full z-50 hidden lg:flex flex-col items-end justify-center pointer-events-auto bg-white py-6 pl-3 pr-2 shadow-lg">
        <div className="text-[10px] font-bold tracking-[0.2em] text-neutral-900/40 mb-4 border-b border-neutral-900/20 pb-2 font-inter w-full text-right">
          {t('cityLabel')}
        </div>
        {cities.map((city, idx) => {
          const isBtnActive = idx === activeIndex;
          return (
            <button
              key={city.id}
              onClick={() => setActiveIndex(idx)}
              className="group flex items-center justify-end gap-2 py-1 pl-4 pr-1 transition-all duration-300 w-full"
            >
              <div
                className={clsx(
                  'flex flex-col items-end transition-all duration-300',
                  isBtnActive ? 'translate-x-0' : 'translate-x-2 group-hover:translate-x-0'
                )}
              >
                <span
                  className={clsx(
                    'text-[12px] font-oswald font-medium uppercase tracking-[0.1em] transition-colors duration-300',
                    isBtnActive
                      ? 'text-neutral-900'
                      : 'text-neutral-900/40 group-hover:text-neutral-900'
                  )}
                >
                  {city.name}
                </span>
              </div>

              <div
                className={clsx(
                  'w-[3px] h-[3px] rounded-full transition-all duration-500',
                  isBtnActive ? 'bg-neutral-900 scale-150' : 'bg-neutral-900/30 group-hover:bg-neutral-900/60'
                )}
              />
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        :global(.animate-blob) { animation: blob 7s infinite; }
      `}</style>
    </div>
  );
}
