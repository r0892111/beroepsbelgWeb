'use client';

import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

interface RefinedHeroProps {
  locale: Locale;
}

export function RefinedHero({ locale }: RefinedHeroProps) {
  const t = useTranslations('home.hero');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
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
          className="object-cover opacity-[0.25]"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ivory/40 to-ivory/20" />

      <div className="absolute top-8 left-8 opacity-10 animate-pulse">
        <Quote size={120} className="text-navy" />
      </div>
      <div className="absolute bottom-12 right-12 opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>
        <Quote size={100} className="text-navy" />
      </div>

      <div className="container mx-auto px-4 py-32 md:py-40 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
              <Quote size={24} className="text-brass" />
              <span className="text-sm md:text-base font-semibold text-navy">
                CNN
              </span>
            </div>
          </div>

          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-8 text-navy leading-tight transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            "One of the 7 savviest guides
            <br />
            <span className="italic bg-gradient-to-r from-brass to-amber-600 bg-clip-text text-transparent">in the world</span>"
          </h1>

          <p className={`text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ color: 'var(--slate-blue)' }}>
            Ontdek Belgische verborgen verhalen met op maat gemaakte culturele tours
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link href={`/${locale}/tours`} className="btn-primary transform hover:scale-105 transition-transform duration-300">
              {t('ctaPrimary')}
            </Link>
            <Link href={`/${locale}/b2b-offerte`} className="btn-secondary transform hover:scale-105 transition-transform duration-300">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-px animate-pulse"
        style={{ background: 'linear-gradient(to right, transparent, var(--brass), transparent)' }}
      />
    </section>
  );
}
