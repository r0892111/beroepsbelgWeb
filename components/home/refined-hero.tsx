'use client';

import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useEffect } from 'react';

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

  return (
    <section className="relative bg-ivory overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/Antwerpen Homepage Foto.jpg"
          alt="Historic Antwerp"
          fill
          sizes="100vw"
          quality={90}
          className="object-cover opacity-[0.25] transition-transform duration-700 ease-out"
          style={{ transform: `scale(${1 + scrollY * 0.0002})` }}
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ivory/40 to-ivory/20" />

      <div className="container mx-auto px-4 py-32 md:py-40 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-light mb-6 text-navy leading-[1.15] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300 }}>
            "One of the 7 savviest guides <span className="italic font-normal" style={{ color: 'var(--brass)' }}>in the world</span>"
          </h1>

          <div className="mb-12">
            <div className="inline-block">
              <span className="text-base md:text-lg font-semibold tracking-[0.25em] uppercase text-navy">
                — CNN
              </span>
            </div>
          </div>

          <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light" style={{ color: 'var(--slate-blue)' }}>
            Ontdek Belgische verborgen verhalen met op maat gemaakte culturele tours
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${locale}/tours`} className="btn-primary">
              {t('ctaPrimary')}
            </Link>
            <Link href={`/${locale}/b2b-offerte`} className="btn-secondary">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--brass), transparent)' }}
      />
    </section>
  );
}
