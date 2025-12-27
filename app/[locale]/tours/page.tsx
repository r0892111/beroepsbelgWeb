import { type Locale } from '@/i18n';
import { getCities, getCityImages } from '@/lib/api/content';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

// Map city slugs (from database) to city IDs (used in CitySection and city_images table)
const citySlugToIdMap: Record<string, string> = {
  'antwerpen': 'antwerp',
  'antwerp': 'antwerp',
  'gent': 'gent',
  'ghent': 'gent',
  'brugge': 'bruges',
  'bruges': 'bruges',
  'brussel': 'brussels',
  'brussels': 'brussels',
  'leuven': 'leuven',
  'knokke-heist': 'knokke-heist',
  'mechelen': 'mechelen',
  'hasselt': 'hasselt',
  'spa': 'spa',
};

interface ToursPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function ToursPage({ params }: ToursPageProps) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const cities = await getCities();
  const cityImages = await getCityImages();
  
  // Override city images with database images from city_images table
  const citiesWithMatchingImages = cities.map(city => {
    const cityId = citySlugToIdMap[city.slug] || city.slug;
    const dbImage = cityImages[cityId]?.photoUrl;
    
    return {
      ...city,
      image: dbImage || city.image, // Use database image if available, otherwise fallback to city.image
    };
  });

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          Tours
        </h1>
        <p className="text-center text-lg md:text-xl text-neutral-600 font-inter mb-16 max-w-2xl mx-auto">
          Discover Belgium's most captivating cities with expert local guides
        </p>

        <div className="grid gap-8 md:gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {citiesWithMatchingImages.map((city) => (
            <div
              key={city.slug}
              className="group flex h-full flex-col bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              {city.image && (
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={city.image}
                    alt={city.name[locale]}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {city.status === 'coming-soon' && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 font-inter">
                        {t('comingSoon')}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 p-6 flex flex-col">
                <h2 className="text-2xl md:text-3xl font-bold font-oswald uppercase tracking-tight text-neutral-900 mb-3">
                  {city.name[locale]}
                </h2>
                <p className="text-base text-neutral-600 font-inter leading-relaxed mb-6 flex-1">
                  {city.teaser[locale]}
                </p>
                <div className="mt-auto">
                  {city.status === 'live' ? (
                    <Link
                      href={`/${locale}/tours-${city.slug}`}
                      className="group/btn relative w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-neutral-900 rounded-full text-neutral-900 font-oswald font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <div className="absolute inset-0 bg-[#1BDD95] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                      <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">
                        {city.ctaText?.[locale] || t('discover')}
                      </span>
                      <ArrowRight className="relative z-10 w-4 h-4 group-hover/btn:text-white transition-colors duration-300" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-neutral-100 border-2 border-neutral-200 rounded-full text-neutral-400 font-oswald font-bold text-sm uppercase tracking-widest cursor-not-allowed"
                    >
                      {t('comingSoon')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
