import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

interface RefinedAboutSectionProps {
  locale: Locale;
}

export function RefinedAboutSection({ locale }: RefinedAboutSectionProps) {
  const t = useTranslations('home.about');

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Turquoise decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-20 -right-20 w-72 h-72 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 20s ease-in-out infinite'
          }}
        />
        <div
          className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 25s ease-in-out infinite reverse'
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block mb-4 relative">
                <div
                  className="h-0.5 w-16 rounded-full mb-4"
                  style={{
                    backgroundColor: 'var(--green-accent)',
                    boxShadow: '0 0 10px rgba(61, 213, 152, 0.4)'
                  }}
                />
                <span
                  className="inline-block text-sm font-semibold tracking-[0.2em] uppercase"
                  style={{ color: 'var(--green-accent)' }}
                >
                  {t('kicker')}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight relative inline-block" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
                {t('title')}
                <br />
                <span className="italic" style={{ color: 'var(--green-accent)' }}>{t('titleItalic')}</span>
                <div
                  className="absolute -bottom-2 left-0 w-1/3 h-1"
                  style={{
                    backgroundColor: 'var(--green-accent)',
                    opacity: 0.3,
                    filter: 'blur(4px)'
                  }}
                />
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

            <div className="relative group">
              {/* Turquoise corner accent */}
              <div
                className="absolute -top-4 -left-4 w-32 h-32 border-t-4 border-l-4 transition-all duration-500 group-hover:w-36 group-hover:h-36 rounded-tl-lg"
                style={{
                  borderColor: 'var(--green-accent)',
                  boxShadow: '0 0 20px rgba(61, 213, 152, 0.2)'
                }}
              />
              {/* Turquoise glow */}
              <div
                className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <div className="bg-white p-12 rounded-xl shadow-lg transition-shadow duration-500 group-hover:shadow-2xl relative">
                <div className="space-y-8">
                  <div className="relative pl-6 border-l-4 transition-colors duration-300 hover:border-l-[6px]" style={{ borderColor: 'var(--green-accent)' }}>
                    <div className="text-5xl font-bold mb-2 transition-colors duration-300" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--green-accent)' }}>12+</div>
                    <p className="text-sm tracking-wider uppercase font-semibold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
                      {t('stat1')}
                    </p>
                  </div>
                  <div className="relative pl-6 border-l-4 transition-colors duration-300 hover:border-l-[6px]" style={{ borderColor: 'var(--green-accent)' }}>
                    <div className="text-5xl font-bold mb-2 transition-colors duration-300" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--green-accent)' }}>50+</div>
                    <p className="text-sm tracking-wider uppercase font-semibold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
                      {t('stat2')}
                    </p>
                  </div>
                  <div className="relative pl-6 border-l-4 transition-colors duration-300 hover:border-l-[6px]" style={{ borderColor: 'var(--green-accent)' }}>
                    <div className="text-5xl font-bold mb-2 transition-colors duration-300" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--green-accent)' }}>10k+</div>
                    <p className="text-sm tracking-wider uppercase font-semibold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
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
