import { type Locale } from '@/i18n';
import { RefinedHero } from '@/components/home/refined-hero';
import { RefinedCitySection } from '@/components/home/refined-city-section';
import { RefinedAboutSection } from '@/components/home/refined-about-section';
import { RefinedCTASection } from '@/components/home/refined-cta-section';
import { getCities, getTours } from '@/lib/data';

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const [cities, tours] = await Promise.all([getCities(), getTours()]);

  return (
    <div className="relative">
      <RefinedHero locale={locale} />
      <div className="section-divider" />
      <RefinedCitySection locale={locale} cities={cities} tours={tours} />
      <RefinedAboutSection locale={locale} />
      <RefinedCTASection locale={locale} />
    </div>
  );
}
