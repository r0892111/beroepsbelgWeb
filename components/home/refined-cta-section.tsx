import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedCTASectionProps {
  locale: Locale;
}

export function RefinedCTASection({ locale }: RefinedCTASectionProps) {
  const t = useTranslations('home.cta');

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-deep-teal via-belgian-navy to-deep-teal">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
              linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
              linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
              linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white)`,
            backgroundSize: '80px 140px',
            backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px'
          }} />
        </div>
      </div>

      <div className="absolute top-10 left-10 w-72 h-72 bg-golden-amber/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-warm-terracotta/20 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 text-golden-amber opacity-0 animate-fade-in-up">
            {t('kicker')}
          </span>

          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight text-white opacity-0 animate-fade-in-up stagger-1">
            {t('title')}
          </h2>

          <p className="text-lg mb-12 leading-relaxed text-warm-sand/90 opacity-0 animate-fade-in-up stagger-2">
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up stagger-3">
            <Link
              href={`/${locale}/tours`}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold rounded-full transition-all duration-300 bg-white text-deep-teal hover:bg-golden-amber hover:text-white shadow-lg hover:shadow-xl hover:scale-105 group"
            >
              <span>{t('ctaPrimary')}</span>
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href={`/${locale}/contact/contactformulier`}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold rounded-full transition-all duration-300 border-2 border-golden-amber text-white hover:bg-golden-amber hover:border-golden-amber shadow-lg hover:shadow-xl hover:scale-105 group"
            >
              <span>{t('ctaSecondary')}</span>
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
