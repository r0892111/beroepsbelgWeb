import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Locale } from '@/i18n';
import { Button } from '@/components/ui/button';

interface HeroProps {
  locale: Locale;
}

export function Hero({ locale }: HeroProps) {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker mb-4">{t('kicker')}</p>
          <h1 className="mb-8 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t('heading')}
          </h1>
          <Button size="lg" asChild>
            <Link href={`/${locale}/tours`}>{t('cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
