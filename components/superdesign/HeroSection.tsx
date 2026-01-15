'use client';

/**
 * Main component file for the Hero Section & Interactive Homepage
 * Implements the pixel-perfect design from the mock with creative parallax effects
 * Features "Red Sea" split animation where elements dismantle on scroll
 * Includes:
 * - Floating Shop Section
 * - Parallax City Showcase
 * - Trust/Press Wall
 */
import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, animate } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShopSection } from './ShopSection';
import { CitySection } from './CitySection';
import { FounderSection } from './FounderSection';
import { PressSection } from './PressSection';
import { type Locale } from '@/i18n';

// --- MAIN HERO COMPONENT ---

// Hook to detect screen size for conditional transforms
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    let timeoutId: any;

    function updateSize() {
      // Debounce to avoid ResizeObserver loops during rapid resizing
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    }

    window.addEventListener('resize', updateSize);

    // Initial set
    setSize({ width: window.innerWidth, height: window.innerHeight });

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, []);
  return size;
}

interface HeroSectionProps {
  locale: Locale;
}

export function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations('hero');
  const { scrollY } = useScroll();
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

      // --- SCROLL SNAP LOGIC ---
      useEffect(() => {
        let scrollTimeout: NodeJS.Timeout;
        let snapAnimation: { stop: () => void } | null = null;
        // Local flag to track if we are currently animating the scroll
        const isSnapping = { current: false };

        const stopSnap = () => {
          if (snapAnimation) {
            snapAnimation.stop();
            snapAnimation = null;
            isSnapping.current = false;
          }
        };

        const handleUserInteraction = () => {
          // If user interacts (scrolls/touches), stop the auto-snap immediately
          stopSnap();
        };

        const handleScroll = () => {
          // If the scroll event is caused by our animation, ignore it
          if (isSnapping.current) return;

          clearTimeout(scrollTimeout);

          scrollTimeout = setTimeout(() => {
            const currentScroll = window.scrollY;
            const viewportHeight = window.innerHeight;

            // Thresholds
            // If user is in the "Limbo" zone (0 < scroll < viewportHeight)
            if (currentScroll > 0 && currentScroll < viewportHeight) {
              const target = currentScroll < viewportHeight * 0.5 ? 0 : viewportHeight;

              // Start snapping
              isSnapping.current = true;

              snapAnimation = animate(window.scrollY, target, {
                type: "spring",
                stiffness: 200,
                damping: 30,
                mass: 0.8,
                onUpdate: (latest) => window.scrollTo(0, latest),
                onComplete: () => {
                  isSnapping.current = false;
                  snapAnimation = null;
                }
              });
            }
          }, 100); // Increased to 100ms (v3 fix) - Fixes mouse wheel "shooting back" bug by handling discrete ticks gracefully
        };

        window.addEventListener('scroll', handleScroll);
        // Listeners to stop animation on user interaction
        window.addEventListener('wheel', handleUserInteraction, { passive: true });
        window.addEventListener('touchstart', handleUserInteraction, { passive: true });
        window.addEventListener('keydown', handleUserInteraction, { passive: true });
        window.addEventListener('mousedown', handleUserInteraction, { passive: true });

        return () => {
          window.removeEventListener('scroll', handleScroll);
          window.removeEventListener('wheel', handleUserInteraction);
          window.removeEventListener('touchstart', handleUserInteraction);
          window.removeEventListener('keydown', handleUserInteraction);
          window.removeEventListener('mousedown', handleUserInteraction);
          clearTimeout(scrollTimeout);
          if (snapAnimation) snapAnimation.stop();
        };
      }, []);

  // --- TRANSFORMS (Responsive) ---

  // 1. Text Animation - Fades out quickly
  const textY = useTransform(scrollY, [0, 400], [0, -100]);
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // 2. Central Station (Left Exit)
  const stationMoveRange = isMobile ? -200 : -800;
  const stationRotateRange = isMobile ? -10 : -25;

  const rawStationX = useTransform(scrollY, [0, 800], [0, stationMoveRange]);
  const rawStationY = useTransform(scrollY, [0, 800], [0, stationMoveRange]);
  const rawStationRotate = useTransform(scrollY, [0, 800], [0, stationRotateRange]);

  const stationX = useSpring(rawStationX, springConfig);
  const stationY = useSpring(rawStationY, springConfig);
  const stationRotate = useSpring(rawStationRotate, springConfig);

  // 3. Frame (Right Exit)
  const frameMoveRangeX = isMobile ? 100 : 800;
  const frameMoveRangeY = isMobile ? -200 : -800;
  const frameRotateRange = isMobile ? 10 : 25;

  const rawFrameX = useTransform(scrollY, [0, 800], [0, frameMoveRangeX]);
  const rawFrameY = useTransform(scrollY, [0, 800], [32, frameMoveRangeY]);
  const rawFrameRotate = useTransform(scrollY, [0, 800], [0, frameRotateRange]);

  const frameX = useSpring(rawFrameX, springConfig);
  const frameY = useSpring(rawFrameY, springConfig);
  const frameRotate = useSpring(rawFrameRotate, springConfig);

  // 4. Next Section "Swoop"
  const swoopY = useTransform(scrollY, [0, 500], [0, -150]);
  const swoopSpring = useSpring(swoopY, springConfig);

  return (
    <div className="relative bg-[#F9F9F7] font-serif selection:bg-[#1BDD95]">

      {/*
        HERO SECTION - STICKY
      */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center z-0">

        {/* Hand-drawn Accents (Markers) - REMOVED */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
             {/* Background elements removed */}
        </div>

        {/* Header moved to root level */}

        {/* Hero Content */}
        <div className="relative w-full h-full flex flex-col items-center justify-center md:justify-start pt-24 md:pt-32 lg:pt-40 px-4 pointer-events-none">
          <motion.div
            style={{ y: textY, opacity: textOpacity }}
            className="text-center max-w-[90vw] md:max-w-4xl mx-auto mb-4 md:mb-8 relative z-50 pointer-events-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight">
              "One of the 7 savviest guides in the world" — CNN
            </h1>

            <div className="mt-8 flex justify-center">
              <a href={`/${locale}/tours`} className="group bg-[#1BDD95] hover:bg-[#14BE82] text-white text-base md:text-lg font-bold py-3 px-8 md:px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2">
                <span className="uppercase tracking-wider">{t('discoverTours')}</span>
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </a>
            </div>
          </motion.div>

          <div className="relative w-full max-w-[100vw] md:max-w-6xl mx-auto flex justify-center items-center pointer-events-auto mt-4 md:-mt-8">

            {/* NEW: Blob that moves with the station - REMOVED */}

            <motion.img
              src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766418602553-9fa4d595/Frame.png"
              alt="Decorative Frame"
              style={{ x: frameX, y: frameY, rotate: frameRotate }}
              className="absolute w-[140%] md:w-[130%] lg:w-[160%] lg:max-w-[1800px] z-30 object-contain drop-shadow-2xl"
            />
            <motion.img
              src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766322327392-d060e164/Central_Station.png"
              alt="Antwerp Central Station Sketch"
              style={{ x: stationX, y: stationY, rotate: stationRotate }}
              className="relative z-40 w-[125%] md:w-[85%] lg:w-full lg:max-w-[1250px] h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]"
            />
          </div>

          {/* SCROLL INDICATOR - HERO (Removed) */}
        </div>
      </div>

      {/*
        NEW INTERACTIVE CONTENT SECTION
        The "Traveller's Scrapbook" Layout
      */}
      <motion.div
        style={{ y: swoopSpring }}
        className="relative z-10 w-full"
      >
         {/* Spacer matches the negative transform (150px) to ensure perfect snap alignment */}
         <div className="h-[150px] w-full pointer-events-none" />

         {/* SECTION 1: CITIES (THE JOURNEY) - SWAPPED TO BE FIRST */}
         <div className="relative z-20">
            {/* City Content */}
            <CitySection locale={locale} />

            {/* Bottom Curve for transition to next section */}
         </div>

         {/* SECTION 2: SHOP (CURATED GOODS) - SWAPPED TO BE SECOND */}
         <div id="shop-section" className="relative w-full z-10 bg-[#F9F9F5] -mt-20 pt-0">
            <ShopSection />
         </div>

         {/* SECTION 3: FOUNDER (ABOUT) */}
         <FounderSection />

         {/* SECTION 4: FEATURED IN (TRUST) */}
         <PressSection />
      </motion.div>
    </div>
  );
}
