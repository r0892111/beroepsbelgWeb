import { type Locale } from '@/i18n';
import { RefinedHero } from '@/components/home/refined-hero';
import { RefinedCitySection } from '@/components/home/refined-city-section';
import { RefinedAboutSection } from '@/components/home/refined-about-section';
import { RefinedCTASection } from '@/components/home/refined-cta-section';
import { ParallaxBackground, MouseTracker } from '@/components/home/decorative-elements';

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <div className="relative">
      <ParallaxBackground />
      <MouseTracker />
      <RefinedHero locale={locale} />
      <RefinedCitySection locale={locale} />
      <RefinedAboutSection locale={locale} />
      <RefinedCTASection locale={locale} />
    </div>
  );
}
