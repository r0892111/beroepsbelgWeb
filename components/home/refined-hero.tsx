'use client';

import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ArrowDown } from 'lucide-react';
import { getHeroVideos, type VideoFile } from '@/lib/supabase/storage';

interface RefinedHeroProps {
  locale: Locale;
}

export function RefinedHero({ locale }: RefinedHeroProps) {
  const t = useTranslations('home.hero');
  const [scrollY, setScrollY] = useState(0);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallbackImage, setShowFallbackImage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadVideos() {
      try {
        const fetchedVideos = await getHeroVideos();
        if (fetchedVideos.length > 0) {
          setVideos(fetchedVideos);
          setShowFallbackImage(false);
        } else {
          setShowFallbackImage(true);
        }
      } catch (error) {
        setShowFallbackImage(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadVideos();
  }, []);

  useEffect(() => {
    if (videos.length > 1 && nextVideoRef.current) {
      const nextIndex = (currentVideoIndex + 1) % videos.length;
      nextVideoRef.current.src = videos[nextIndex].url;
      nextVideoRef.current.load();
      // Ensure next video is ready to play
      nextVideoRef.current.currentTime = 0;
    }
  }, [currentVideoIndex, videos]);

  const handleVideoEnd = () => {
    // If only one video, loop it
    if (videos.length === 1 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      return;
    }

    if (videos.length <= 1) return;

    const nextIndex = (currentVideoIndex + 1) % videos.length;
    console.log('[Hero] Video ended, transitioning from', currentVideoIndex, 'to', nextIndex);

    if (videoRef.current && nextVideoRef.current) {
      // Fade out current video
      videoRef.current.style.opacity = '0';
      
      // Prepare and play next video
      nextVideoRef.current.currentTime = 0; // Start from beginning
      nextVideoRef.current.style.opacity = '1';
      
      // Play the next video
      const playPromise = nextVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Hero] Next video started playing');
          })
          .catch((error) => {
            console.error('[Hero] Error playing next video:', error);
          });
      }

      // Update index after transition completes
      setTimeout(() => {
        setCurrentVideoIndex(nextIndex);
        // Swap refs: current becomes next, next becomes current
        if (videoRef.current) {
          videoRef.current.style.opacity = '1';
        }
      }, 1000);
    }
  };

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Video Background - Behind everything */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {!isLoading && videos.length > 0 && !showFallbackImage ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              key={`video-${currentVideoIndex}`}
              src={videos[currentVideoIndex]?.url}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
              style={{ opacity: 1, zIndex: 0 }}
              autoPlay
              muted
              playsInline
              loop={videos.length === 1}
              onEnded={handleVideoEnd}
              onError={() => setShowFallbackImage(true)}
              onLoadedData={() => {
                console.log('[Hero] Current video loaded:', videos[currentVideoIndex]?.name);
                if (videoRef.current) {
                  videoRef.current.play().catch((err) => {
                    console.error('[Hero] Play error:', err);
                  });
                }
              }}
            />
            {videos.length > 1 && (
              <video
                ref={nextVideoRef}
                key={`next-video-${(currentVideoIndex + 1) % videos.length}`}
                src={videos[(currentVideoIndex + 1) % videos.length]?.url}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                style={{ opacity: 0, zIndex: 0 }}
                muted
                playsInline
                preload="auto"
                onLoadedData={() => {
                  console.log('[Hero] Next video preloaded:', videos[(currentVideoIndex + 1) % videos.length]?.name);
                  // Ensure it's ready to play
                  if (nextVideoRef.current) {
                    nextVideoRef.current.currentTime = 0;
                  }
                }}
                onCanPlay={() => {
                  console.log('[Hero] Next video can play');
                }}
              />
            )}
          </div>
        ) : (
          <Image
            src="/Antwerpen Homepage Foto.jpg"
            alt="Historic Antwerp"
            fill
            sizes="100vw"
            quality={95}
            className="object-cover opacity-[0.35] transition-transform duration-1000 ease-out"
            style={{ transform: `scale(${1 + scrollY * 0.0001})` }}
            priority
          />
        )}
      </div>
      
      {/* Subtle gradient overlays - Above video, below text */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" style={{ zIndex: 1 }} />

      {/* Hero Content - Above video and gradients */}
      <div className="container mx-auto px-6 md:px-12 relative flex-1 flex items-center justify-center" style={{ zIndex: 10, position: 'relative' }}>
        <div className="w-full max-w-4xl flex flex-col items-center gap-6">
          {/* Box 1: CNN Quote */}
          <div
            className="backdrop-blur-md rounded-2xl px-4 py-3 md:px-5 md:py-3.5 border w-full text-center"
            style={{
              backgroundColor: 'rgba(255, 252, 248, 0.82)',
              borderColor: 'rgba(0, 0, 0, 0.06)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 3px rgba(0, 0, 0, 0.08)',
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
          >
            <h1
              className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#2c1810',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                letterSpacing: '-0.02em',
                fontWeight: 600
              }}
            >
              "One of the 7 savviest guides in the world"
            </h1>
            <p
              className="text-sm md:text-base mt-3 font-light"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#5a4a42',
                fontWeight: 400
              }}
            >
              — CNN
            </p>
          </div>

          {/* Box 2: Main Tagline */}
          <div
            className="backdrop-blur-md rounded-2xl px-4 py-3 md:px-5 md:py-3.5 border w-full text-center"
            style={{
              backgroundColor: 'rgba(255, 252, 248, 0.82)',
              borderColor: 'rgba(0, 0, 0, 0.06)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 3px rgba(0, 0, 0, 0.08)',
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
          >
            <p
              className="text-lg md:text-xl lg:text-2xl font-light leading-relaxed"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#5a4a42',
                lineHeight: '1.7',
                fontWeight: 400
              }}
            >
              {t('headline')}
            </p>
          </div>

          {/* Buttons - No Box */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <div className="relative group">
              <div
                className="absolute -inset-2 rounded-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-xl"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Link
                href={`/${locale}/tours`}
                className="btn-primary relative inline-flex items-center gap-2 group w-full sm:w-auto justify-center"
              >
                {t('ctaPrimary') || 'Explore Tours'}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <Link
              href={`/${locale}/b2b-offerte`}
              className="group relative overflow-hidden w-full sm:w-auto justify-center inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 252, 248, 0.95)',
                color: '#2c1810',
                border: '2px solid #2c1810',
                boxShadow: '0 4px 12px rgba(44, 24, 16, 0.2)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('ctaSecondary') || 'Business Inquiries'}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-0 right-0 flex justify-center" style={{ zIndex: 10 }}>
        <button
          onClick={scrollToContent}
          className="flex flex-col items-center gap-2 transition-all duration-300 hover:opacity-70 group relative"
          aria-label="Scroll to content"
        >
          <span className="text-xs font-semibold uppercase tracking-wider transition-colors duration-300 group-hover:text-[var(--green-accent)]" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>{t('scroll')}</span>
          <ArrowDown className="w-5 h-5 animate-bounce transition-colors duration-300 group-hover:text-[var(--green-accent)]" style={{ color: 'var(--text-secondary)' }} />
          <div
            className="absolute -bottom-2 w-12 h-12 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
            style={{ backgroundColor: 'var(--green-accent)' }}
          />
        </button>
      </div>
    </section>
  );
}
