import Link from 'next/link';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedCTASectionProps {
  locale: Locale;
}

export function RefinedCTASection({ locale }: RefinedCTASectionProps) {
  const t = useTranslations('home.cta');

  return (
    <section className="py-24 relative overflow-hidden bg-ivory">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(30deg, var(--belgian-navy) 12%, transparent 12.5%, transparent 87%, var(--belgian-navy) 87.5%, var(--belgian-navy)),
            linear-gradient(150deg, var(--belgian-navy) 12%, transparent 12.5%, transparent 87%, var(--belgian-navy) 87.5%, var(--belgian-navy)),
            linear-gradient(30deg, var(--belgian-navy) 12%, transparent 12.5%, transparent 87%, var(--belgian-navy) 87.5%, var(--belgian-navy)),
            linear-gradient(150deg, var(--belgian-navy) 12%, transparent 12.5%, transparent 87%, var(--belgian-navy) 87.5%, var(--belgian-navy))`,
          backgroundSize: '80px 140px',
          backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <span
            className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: 'var(--brass)' }}
          >
            {t('kicker')}
          </span>

          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight" style={{ color: 'var(--belgian-navy)' }}>
            {t('title')}
          </h2>

          <p className="text-lg mb-12 leading-relaxed" style={{ color: 'var(--slate-blue)' }}>
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/tours`}
              className="btn-primary inline-flex items-center justify-center px-8 py-3 font-semibold rounded"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href={`/${locale}/contact/contactformulier`}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold rounded transition-all duration-300 border-2 hover:bg-brass hover:text-navy"
              style={{ borderColor: 'var(--brass)', color: 'var(--brass)' }}
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
