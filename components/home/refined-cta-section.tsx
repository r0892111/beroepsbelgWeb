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
      <div className="absolute inset-0 bg-gradient-to-br from-royal-purple via-ocean-blue to-mint-green">
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

      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-electric-gold/30 to-sunset-orange/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-gradient-to-br from-vibrant-coral/30 to-accent-pink/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-accent-lime/25 to-mint-green/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-electric-gold via-sunset-orange to-vibrant-coral bg-clip-text text-transparent opacity-0 animate-fade-in-up">
            {t('kicker')}
          </span>

          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight text-white opacity-0 animate-fade-in-up stagger-1 drop-shadow-lg">
            {t('title')}
          </h2>

          <p className="text-lg mb-12 leading-relaxed text-white/90 opacity-0 animate-fade-in-up stagger-2">
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up stagger-3">
            <Link
              href={`/${locale}/tours`}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold rounded-full transition-all duration-300 bg-gradient-to-r from-electric-gold to-sunset-orange text-white hover:from-sunset-orange hover:to-vibrant-coral shadow-2xl hover:shadow-3xl hover:scale-110 group"
            >
              <span>{t('ctaPrimary')}</span>
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href={`/${locale}/contact/contactformulier`}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold rounded-full transition-all duration-300 border-3 border-white text-white hover:bg-white hover:text-royal-purple shadow-2xl hover:shadow-3xl hover:scale-110 group"
              style={{ borderWidth: '3px' }}
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
