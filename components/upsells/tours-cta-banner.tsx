'use client';

import Link from 'next/link';
import { ArrowRight, Map } from 'lucide-react';
import { type Locale } from '@/lib/data/types';

interface ToursCTABannerProps {
  locale: Locale;
  title?: string;
  description?: string;
  ctaText?: string;
}

export function ToursCTABanner({
  locale,
  title = "Ready to Explore Belgium?",
  description = "Join our expert guides and discover hidden gems, fascinating stories, and authentic experiences",
  ctaText = "Book a Tour Now"
}: ToursCTABannerProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center"
      style={{
        background: 'linear-gradient(135deg, var(--primary-base) 0%, #2dd4bf 100%)',
        boxShadow: 'var(--shadow-large)',
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
          <Map className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h2>

        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          {description}
        </p>

        <Link
          href={`/${locale}/tours`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[var(--primary-base)] font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {ctaText}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
