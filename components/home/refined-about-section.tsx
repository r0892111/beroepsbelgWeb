import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedAboutSectionProps {
  locale: Locale;
}

export function RefinedAboutSection({ locale }: RefinedAboutSectionProps) {
  const t = useTranslations('home.about');

  return (
    <section className="py-24 bg-gradient-to-br from-soft-cream via-white to-soft-cream relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-deep-teal/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-golden-amber/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="opacity-0 animate-slide-in-left">
              <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-golden-amber to-warm-terracotta bg-clip-text text-transparent">
                {t('kicker')}
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6 leading-tight">
                {t('title')}
                <br />
                <span className="italic bg-gradient-to-r from-deep-teal to-accent-sage bg-clip-text text-transparent">{t('titleItalic')}</span>
              </h2>
              <div className="space-y-4 text-lg text-slate">
                <p className="leading-relaxed">
                  {t('paragraph1')}
                </p>
                <p className="leading-relaxed">
                  {t('paragraph2')}
                </p>
              </div>
            </div>

            <div className="relative opacity-0 animate-slide-in-right">
              <div className="absolute -top-4 -left-4 w-32 h-32 border-t-2 border-l-2 border-golden-amber transition-all duration-300" />

              <div className="bg-gradient-to-br from-warm-sand/40 to-golden-amber/20 p-12 rounded-2xl backdrop-blur-sm border border-golden-amber/20 shadow-lg">
                <div className="space-y-8">
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-deep-teal to-belgian-navy bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      12+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-slate font-medium">
                      {t('stat1')}
                    </p>
                    <div className="h-1 w-16 bg-gradient-to-r from-golden-amber to-warm-terracotta rounded-full mt-2 group-hover:w-24 transition-all duration-300" />
                  </div>
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-deep-teal to-belgian-navy bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      50+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-slate font-medium">
                      {t('stat2')}
                    </p>
                    <div className="h-1 w-16 bg-gradient-to-r from-golden-amber to-warm-terracotta rounded-full mt-2 group-hover:w-24 transition-all duration-300" />
                  </div>
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-deep-teal to-belgian-navy bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      10k+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-slate font-medium">
                      {t('stat3')}
                    </p>
                    <div className="h-1 w-16 bg-gradient-to-r from-golden-amber to-warm-terracotta rounded-full mt-2 group-hover:w-24 transition-all duration-300" />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-32 h-32 border-b-2 border-r-2 border-warm-terracotta transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
