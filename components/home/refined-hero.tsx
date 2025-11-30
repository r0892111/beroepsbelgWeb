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
        console.error('Error loading videos:', error);
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
    <section className="relative overflow-hidden min-h-screen flex flex-col" style={{ backgroundColor: 'var(--white)' }}>
      {/* Animated turquoise gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(100px)',
            animation: 'float 25s ease-in-out infinite'
          }}
        />
        <div
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(100px)',
            animation: 'float 30s ease-in-out infinite reverse'
          }}
        />
      </div>

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
                  videoRef.current.play().catch(err => console.error('[Hero] Play error:', err));
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
      
      {/* Gradient overlays - Above video, below text */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white/80" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--green-accent)]/5 via-transparent to-transparent" style={{ zIndex: 1 }} />

      {/* Hero Content - Above video and gradients */}
      <div className="container mx-auto px-6 md:px-12 py-24 md:py-32 lg:py-40 relative flex-1 flex items-center" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto text-center">
          {/* Animated turquoise accent */}
          <div className="inline-block mb-6 relative">
            <div
              className="h-1 w-24 mx-auto rounded-full"
              style={{
                backgroundColor: 'var(--green-accent)',
                boxShadow: '0 0 20px rgba(61, 213, 152, 0.6)'
              }}
            />
            <div
              className="absolute inset-0 h-1 w-24 mx-auto rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--green-accent)',
                opacity: 0.4
              }}
            />
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight tracking-tight relative inline-block" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
            {t('headline')}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-2 w-3/4 opacity-10"
              style={{
                backgroundColor: 'var(--green-accent)',
                filter: 'blur(12px)'
              }}
            />
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl mb-16 max-w-3xl mx-auto font-light leading-relaxed" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
            {t('subtitle') || 'Curated cultural walking tours that reveal the hidden stories of Belgian cities'}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <div className="relative group">
              <div
                className="absolute -inset-2 rounded-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-xl"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Link
                href={`/${locale}/tours`}
                className="btn-primary relative inline-flex items-center gap-2 group"
              >
                {t('ctaPrimary') || 'Explore Tours'}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <Link
              href={`/${locale}/b2b-offerte`}
              className="btn-secondary group relative overflow-hidden"
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

      <div className="absolute bottom-12 left-0 right-0 flex justify-center" style={{ zIndex: 10 }}>
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
