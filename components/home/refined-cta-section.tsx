'use client';

import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedCTASectionProps {
  locale: Locale;
}

export function RefinedCTASection({ locale }: RefinedCTASectionProps) {
  const t = useTranslations('home.cta');

  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Sophisticated gradient background with depth */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(circle at 30% 50%, rgba(61, 213, 152, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(61, 213, 152, 0.06) 0%, transparent 50%), linear-gradient(180deg, #FFFFFF 0%, #F8FBF9 100%)'
      }} />

      {/* Animated decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large floating orb */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, var(--green-accent) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float 25s ease-in-out infinite'
          }}
        />
        {/* Smaller accent orb */}
        <div
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, var(--green-accent) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'float 30s ease-in-out infinite reverse'
          }}
        />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--green-accent) 1px, transparent 1px), linear-gradient(90deg, var(--green-accent) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        {/* Content card with sophisticated design */}
        <div className="max-w-5xl mx-auto">
          <div
            className="relative bg-white rounded-3xl shadow-xl overflow-hidden"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(61, 213, 152, 0.1)'
            }}
          >
            {/* Decorative top border with animation */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--green-accent)] to-transparent opacity-60" />

            {/* Subtle corner accents */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.06]" style={{
              background: 'radial-gradient(circle at top right, var(--green-accent) 0%, transparent 70%)'
            }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.06]" style={{
              background: 'radial-gradient(circle at bottom left, var(--green-accent) 0%, transparent 70%)'
            }} />

            <div className="relative px-8 md:px-16 py-12 md:py-16">
              {/* Kicker with refined style */}
              <div className="text-center mb-6">
                <span
                  className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.25em] uppercase px-4 py-2 rounded-full"
                  style={{
                    color: 'var(--green-accent)',
                    backgroundColor: 'rgba(61, 213, 152, 0.08)',
                    border: '1px solid rgba(61, 213, 152, 0.2)'
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--green-accent)' }} />
                  {t('kicker')}
                </span>
              </div>

              {/* Main heading with dramatic typography */}
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-6 leading-tight"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em'
                }}
              >
                {t('title')}
              </h2>

              {/* Description with better spacing */}
              <p
                className="text-base md:text-lg text-center mb-10 max-w-2xl mx-auto leading-relaxed"
                style={{
                  color: 'var(--text-secondary)',
                  opacity: 0.9
                }}
              >
                {t('description')}
              </p>

              {/* CTA buttons with enhanced design */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {/* Primary CTA */}
                <Link
                  href={`/${locale}/tours`}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 font-bold text-base md:text-lg rounded-xl overflow-hidden"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    backgroundColor: 'var(--green-accent)',
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(61, 213, 152, 0.4)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Animated background on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{
                      background: 'linear-gradient(135deg, var(--green-dark) 0%, var(--green-accent) 100%)',
                      transition: 'opacity 0.4s ease-out'
                    }}
                  />

                  {/* Button content */}
                  <span className="relative z-10">{t('ctaPrimary')}</span>
                  <svg
                    className="relative z-10 w-5 h-5"
                    style={{
                      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>

                  {/* Hover styles */}
                  <style jsx>{`
                    a:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 8px 24px rgba(61, 213, 152, 0.5) !important;
                    }
                    a:hover svg {
                      transform: translateX(4px);
                    }
                  `}</style>
                </Link>

                {/* Secondary CTA */}
                <Link
                  href={`/${locale}/contact/contactformulier`}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 font-bold text-base md:text-lg rounded-xl overflow-hidden bg-white"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    border: '2px solid var(--green-accent)',
                    color: 'var(--green-accent)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Fill animation on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{
                      backgroundColor: 'var(--green-accent)',
                      transform: 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out'
                    }}
                  />

                  {/* Button content */}
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
                    {t('ctaSecondary')}
                  </span>
                  <svg
                    className="relative z-10 w-5 h-5 transition-colors duration-300 group-hover:text-white"
                    style={{
                      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease-out'
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Hover styles */}
                  <style jsx>{`
                    a:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 8px 24px rgba(61, 213, 152, 0.3) !important;
                    }
                    a:hover div {
                      transform: scaleX(1) !important;
                    }
                    a:hover svg {
                      transform: translateX(4px);
                    }
                  `}</style>
                </Link>
              </div>

              {/* Decorative bottom element */}
              <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2 opacity-40">
                  <div className="w-8 h-px bg-gradient-to-r from-transparent to-[var(--green-accent)]" />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--green-accent)' }} />
                  <div className="w-8 h-px bg-gradient-to-l from-transparent to-[var(--green-accent)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
