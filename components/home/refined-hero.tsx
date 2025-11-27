'use client';

import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';

interface RefinedHeroProps {
  locale: Locale;
}

export function RefinedHero({ locale }: RefinedHeroProps) {
  const t = useTranslations('home.hero');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col" style={{ backgroundColor: 'var(--white)' }}>
      <div className="absolute inset-0">
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
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white/80" />

      <div className="container mx-auto px-6 md:px-12 py-24 md:py-32 lg:py-40 relative flex-1 flex items-center">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
            Discover Belgium through the eyes of its most passionate storyteller
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl mb-16 max-w-3xl mx-auto font-light leading-relaxed" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
            {t('subtitle') || 'Curated cultural walking tours that reveal the hidden stories of Belgian cities'}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link href={`/${locale}/tours`} className="btn-primary">
              {t('ctaPrimary') || 'Explore Tours'}
            </Link>
            <Link href={`/${locale}/b2b-offerte`} className="btn-secondary">
              {t('ctaSecondary') || 'Business Inquiries'}
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <button
          onClick={scrollToContent}
          className="flex flex-col items-center gap-2 transition-opacity duration-300 hover:opacity-70 group"
          aria-label="Scroll to content"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Scroll</span>
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
