import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedAboutSectionProps {
  locale: Locale;
}

export function RefinedAboutSection({ locale }: RefinedAboutSectionProps) {
  const t = useTranslations('home.about');

  return (
    <section className="py-24 bg-ivory">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span
                className="inline-block text-sm font-semibold tracking-[0.2em] uppercase mb-4"
                style={{ color: 'var(--brass)' }}
              >
                {t('kicker')}
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6 leading-tight">
                {t('title')}
                <br />
                <span className="italic">{t('titleItalic')}</span>
              </h2>
              <div className="space-y-4 text-lg" style={{ color: 'var(--slate-blue)' }}>
                <p className="leading-relaxed">
                  {t('paragraph1')}
                </p>
                <p className="leading-relaxed">
                  {t('paragraph2')}
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -top-4 -left-4 w-32 h-32 border-t-2 border-l-2"
                style={{ borderColor: 'var(--brass)' }}
              />
              <div className="bg-sand p-12 rounded">
                <div className="space-y-8">
                  <div>
                    <div className="text-5xl font-serif font-bold text-navy mb-2">12+</div>
                    <p className="text-sm tracking-wider uppercase" style={{ color: 'var(--slate-blue)' }}>
                      {t('stat1')}
                    </p>
                  </div>
                  <div>
                    <div className="text-5xl font-serif font-bold text-navy mb-2">50+</div>
                    <p className="text-sm tracking-wider uppercase" style={{ color: 'var(--slate-blue)' }}>
                      {t('stat2')}
                    </p>
                  </div>
                  <div>
                    <div className="text-5xl font-serif font-bold text-navy mb-2">10k+</div>
                    <p className="text-sm tracking-wider uppercase" style={{ color: 'var(--slate-blue)' }}>
                      {t('stat3')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
