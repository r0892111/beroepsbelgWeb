import { type Locale } from '@/i18n';
import { getCities } from '@/lib/api/content';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, MapPin, Home } from 'lucide-react';

interface AirBNBPageProps {
  params: Promise<{ locale: Locale }>;
}

// Placeholder cities for AirBNB properties
const airbnbCities = [
  { slug: 'antwerpen', name: { nl: 'Antwerpen', en: 'Antwerp', fr: 'Anvers', de: 'Antwerpen' } },
  { slug: 'brussel', name: { nl: 'Brussel', en: 'Brussels', fr: 'Bruxelles', de: 'Brüssel' } },
  { slug: 'brugge', name: { nl: 'Brugge', en: 'Bruges', fr: 'Bruges', de: 'Brügge' } },
  { slug: 'gent', name: { nl: 'Gent', en: 'Ghent', fr: 'Gand', de: 'Gent' } },
];

// Placeholder properties per city
const placeholderProperties = [
  {
    id: '1',
    title: 'Charming City Center Apartment',
    location: 'City Center',
    price: 120,
    image: '/placeholder-property.jpg',
  },
  {
    id: '2',
    title: 'Historic Townhouse',
    location: 'Old Town',
    price: 150,
    image: '/placeholder-property.jpg',
  },
  {
    id: '3',
    title: 'Modern Loft with View',
    location: 'Riverside',
    price: 180,
    image: '/placeholder-property.jpg',
  },
];

export default async function AirBNBPage({ params }: AirBNBPageProps) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          AirBNB
        </h1>
        <p className="text-center text-lg md:text-xl text-neutral-600 font-inter mb-16 max-w-2xl mx-auto">
          Discover unique accommodations in Belgium's most beautiful cities
        </p>

        <div className="mb-8 p-6 bg-[#1BDD95]/10 border-2 border-[#1BDD95] rounded-2xl">
          <p className="text-center text-neutral-700 font-inter">
            <strong>Coming Soon:</strong> We're currently setting up our AirBNB listings. Check back soon for available properties!
          </p>
        </div>

        <div className="space-y-16">
          {airbnbCities.map((city) => (
            <div key={city.slug} className="space-y-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-[#1BDD95]" />
                <h2 className="text-3xl md:text-4xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
                  {city.name[locale]}
                </h2>
              </div>

              <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {placeholderProperties.map((property) => (
                  <div
                    key={property.id}
                    className="group flex h-full flex-col bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                  >
                    <div className="relative h-64 w-full overflow-hidden bg-neutral-200">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Home className="h-16 w-16 text-neutral-400" />
                      </div>
                      {/* Placeholder for property image */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1BDD95]/20 to-neutral-300/20" />
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <h3 className="text-xl md:text-2xl font-bold font-oswald uppercase tracking-tight text-neutral-900 mb-2">
                        {property.title}
                      </h3>
                      <p className="text-sm text-neutral-500 font-inter mb-4 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {property.location}
                      </p>
                      <div className="mt-auto pt-4 border-t border-neutral-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold font-oswald text-[#1BDD95]">
                              €{property.price}
                            </span>
                            <span className="text-sm text-neutral-500 font-inter ml-1">/ night</span>
                          </div>
                          <Link
                            href={`/${locale}/airbnb/${city.slug}/${property.id}`}
                            className="group/btn relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#1BDD95] rounded-full text-[#1BDD95] font-oswald font-bold text-xs uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
                          >
                            <div className="absolute inset-0 bg-[#1BDD95] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">
                              View Details
                            </span>
                            <ArrowRight className="relative z-10 w-3 h-3 group-hover/btn:text-white transition-colors duration-300" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


