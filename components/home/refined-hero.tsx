import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface RefinedHeroProps {
  locale: Locale;
}

export function RefinedHero({ locale }: RefinedHeroProps) {
  const t = useTranslations('home.hero');

  return (
    <section className="relative bg-gradient-to-br from-soft-cream via-warm-sand/30 to-soft-cream overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.pexels.com/photos/16139366/pexels-photo-16139366.jpeg"
          alt="Historic Antwerp"
          fill
          className="object-cover opacity-[0.12] mix-blend-multiply"
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-deep-teal/5 via-transparent to-warm-terracotta/5" />

      <div className="absolute top-20 right-20 w-72 h-72 bg-golden-amber/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-deep-teal/10 rounded-full blur-3xl" style={{ animationDelay: '1.5s' }} />

      <div className="container mx-auto px-4 py-32 md:py-40 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 opacity-0 animate-fade-in-up">
            <span
              className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-golden-amber to-warm-terracotta bg-clip-text text-transparent"
            >
              {t('kicker')}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8 text-navy leading-tight opacity-0 animate-fade-in-up stagger-1">
            {t('title')}
            <br />
            <span className="italic bg-gradient-to-r from-deep-teal to-belgian-navy bg-clip-text text-transparent">{t('titleItalic')}</span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed text-slate opacity-0 animate-fade-in-up stagger-2">
            {t('description')}
            <br />
            <span className="font-medium">{t('tagline')}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up stagger-3">
            <Link href={`/${locale}/tours`} className="btn-primary group">
              <span>{t('ctaPrimary')}</span>
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href={`/${locale}/b2b-offerte`} className="btn-secondary group">
              <span>{t('ctaSecondary')}</span>
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-soft-cream to-transparent" />
    </section>
  );
}
