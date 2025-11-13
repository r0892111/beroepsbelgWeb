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
    <section className="relative bg-ivory overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.pexels.com/photos/16139366/pexels-photo-16139366.jpeg"
          alt="Historic Antwerp"
          fill
          className="object-cover opacity-[0.08]"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-champagne-sand/20 to-transparent" />

      <div className="container mx-auto px-4 py-32 md:py-40 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <span
              className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4"
              style={{ color: 'var(--brass)' }}
            >
              {t('kicker')}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8 text-navy leading-tight">
            {t('title')}
            <br />
            <span className="italic">{t('titleItalic')}</span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
            {t('description')}
            <br />
            {t('tagline')}
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
