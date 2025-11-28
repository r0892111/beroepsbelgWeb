import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedCTASectionProps {
  locale: Locale;
}

export function RefinedCTASection({ locale }: RefinedCTASectionProps) {
  const t = useTranslations('home.cta');

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FAFAF9 0%, #F0FAF7 100%)' }}>
      {/* Turquoise gradient pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(30deg, var(--green-accent) 12%, transparent 12.5%, transparent 87%, var(--green-accent) 87.5%, var(--green-accent)),
            linear-gradient(150deg, var(--green-accent) 12%, transparent 12.5%, transparent 87%, var(--green-accent) 87.5%, var(--green-accent)),
            linear-gradient(30deg, var(--green-accent) 12%, transparent 12.5%, transparent 87%, var(--green-accent) 87.5%, var(--green-accent)),
            linear-gradient(150deg, var(--green-accent) 12%, transparent 12.5%, transparent 87%, var(--green-accent) 87.5%, var(--green-accent))`,
          backgroundSize: '80px 140px',
          backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px'
        }} />
      </div>

      {/* Floating turquoise orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-10 w-96 h-96 rounded-full opacity-10"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(120px)',
            animation: 'float 30s ease-in-out infinite'
          }}
        />
        <div
          className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full opacity-10"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(120px)',
            animation: 'float 35s ease-in-out infinite reverse'
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Turquoise accent bar */}
          <div className="inline-block mb-6 relative">
            <div
              className="h-1 w-20 mx-auto rounded-full"
              style={{
                backgroundColor: 'var(--green-accent)',
                boxShadow: '0 0 20px rgba(61, 213, 152, 0.5)'
              }}
            />
            <div
              className="absolute inset-0 h-1 w-20 mx-auto rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--green-accent)',
                opacity: 0.3
              }}
            />
          </div>

          <span
            className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: 'var(--green-accent)' }}
          >
            {t('kicker')}
          </span>

          <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight relative inline-block" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
            {t('title')}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 opacity-15"
              style={{
                backgroundColor: 'var(--green-accent)',
                filter: 'blur(8px)'
              }}
            />
          </h2>

          <p className="text-lg mb-12 leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="relative group">
              <div
                className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-xl"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Link
                href={`/${locale}/tours`}
                className="btn-primary relative inline-flex items-center justify-center gap-2 px-10 py-4 font-semibold rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
                style={{
                  backgroundColor: 'var(--green-accent)',
                  color: 'white',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                {t('ctaPrimary')}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <Link
              href={`/${locale}/contact/contactformulier`}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 font-semibold rounded-full transition-all duration-300 border-2 hover:shadow-lg group"
              style={{
                borderColor: 'var(--green-accent)',
                color: 'var(--green-accent)',
                fontFamily: 'Montserrat, sans-serif'
              }}
            >
              {t('ctaSecondary')}
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
