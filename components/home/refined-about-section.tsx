import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedAboutSectionProps {
  locale: Locale;
}

export function RefinedAboutSection({ locale }: RefinedAboutSectionProps) {
  const t = useTranslations('home.about');

  return (
    <section className="py-24 bg-gradient-to-br from-accent-pink/5 via-white to-mint-green/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-to-br from-royal-purple/10 to-ocean-blue/10 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-electric-gold/10 to-vibrant-coral/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="opacity-0 animate-slide-in-left">
              <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase mb-4 bg-gradient-to-r from-sunset-orange via-vibrant-coral to-accent-pink bg-clip-text text-transparent">
                {t('kicker')}
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6 leading-tight">
                {t('title')}
                <br />
                <span className="italic bg-gradient-to-r from-mint-green via-ocean-blue to-royal-purple bg-clip-text text-transparent">{t('titleItalic')}</span>
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
              <div className="absolute -top-4 -left-4 w-32 h-32 border-t-3 border-l-3 bg-gradient-to-br from-electric-gold to-sunset-orange" style={{ borderWidth: '3px', borderStyle: 'solid', borderImage: 'linear-gradient(135deg, var(--electric-gold), var(--sunset-orange)) 1' }} />

              <div className="bg-gradient-to-br from-royal-purple/10 via-ocean-blue/10 to-mint-green/10 p-12 rounded-2xl backdrop-blur-sm border-2 border-electric-gold/30 shadow-2xl">
                <div className="space-y-8">
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-ocean-blue via-royal-purple to-vibrant-coral bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      12+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-charcoal font-bold">
                      {t('stat1')}
                    </p>
                    <div className="h-1.5 w-16 bg-gradient-to-r from-electric-gold via-sunset-orange to-vibrant-coral rounded-full mt-2 group-hover:w-28 transition-all duration-300 shadow-lg" />
                  </div>
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-mint-green via-ocean-blue to-royal-purple bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      50+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-charcoal font-bold">
                      {t('stat2')}
                    </p>
                    <div className="h-1.5 w-16 bg-gradient-to-r from-mint-green via-ocean-blue to-royal-purple rounded-full mt-2 group-hover:w-28 transition-all duration-300 shadow-lg" />
                  </div>
                  <div className="group cursor-default">
                    <div className="text-5xl font-serif font-bold bg-gradient-to-r from-sunset-orange via-vibrant-coral to-accent-pink bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                      10k+
                    </div>
                    <p className="text-sm tracking-wider uppercase text-charcoal font-bold">
                      {t('stat3')}
                    </p>
                    <div className="h-1.5 w-16 bg-gradient-to-r from-vibrant-coral via-accent-pink to-royal-purple rounded-full mt-2 group-hover:w-28 transition-all duration-300 shadow-lg" />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-32 h-32" style={{ borderWidth: '3px', borderStyle: 'solid', borderBottom: '3px solid', borderRight: '3px solid', borderImage: 'linear-gradient(135deg, var(--vibrant-coral), var(--accent-pink)) 1' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
