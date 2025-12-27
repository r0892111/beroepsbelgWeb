import { type Locale } from '@/i18n';
import { HeroSection } from '@/components/superdesign';
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
      <HeroSection locale={locale} />
    </div>
  );
}
