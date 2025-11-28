import { type Locale } from '@/i18n';
import { RefinedHero } from '@/components/home/refined-hero';
import { SpotlightCarousel } from '@/components/home/spotlight-carousel';
import { RefinedCitySection } from '@/components/home/refined-city-section';
import { RefinedAboutSection } from '@/components/home/refined-about-section';
import { RefinedCTASection } from '@/components/home/refined-cta-section';
import { getCities, getTours, getProducts } from '@/lib/data';

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const [cities, tours, products] = await Promise.all([
    getCities(),
    getTours(),
    getProducts()
  ]);

  const spotlightProducts = products.slice(0, 6);

  return (
    <div className="relative">
      <RefinedHero locale={locale} />
      <div className="section-divider" />
      <SpotlightCarousel products={spotlightProducts} />
      <div className="section-divider" />
      <RefinedCitySection locale={locale} cities={cities} tours={tours} />
      <RefinedAboutSection locale={locale} />
      <RefinedCTASection locale={locale} />
    </div>
  );
}
