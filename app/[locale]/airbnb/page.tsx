import { type Locale } from '@/i18n';
import { getCities, getAirBNBListings } from '@/lib/api/content';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, MapPin, Home } from 'lucide-react';

interface AirBNBPageProps {
  params: Promise<{ locale: Locale }>;
}

interface AirBNBListing {
  id: string;
  url: string;
  price: number | null;
  title: string;
  image_url: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default async function AirBNBPage({ params }: AirBNBPageProps) {
  const { locale } = await params;
  const t = await getTranslations('common');
  
  // Fetch real data
  const [cities, airbnbListings] = await Promise.all([
    getCities(),
    getAirBNBListings(),
  ]);

  // Group listings by city
  const groupedByCity = new Map<string, AirBNBListing[]>();
  airbnbListings.forEach(listing => {
    const cityKey = listing.city || 'no-city';
    if (!groupedByCity.has(cityKey)) {
      groupedByCity.set(cityKey, []);
    }
    groupedByCity.get(cityKey)!.push(listing);
  });

  // Sort cities: no-city last, then by city order from cities array
  const sortedCityKeys = Array.from(groupedByCity.keys()).sort((a, b) => {
    if (a === 'no-city') return 1;
    if (b === 'no-city') return -1;
    
    // Find city order from cities array
    const cityA = cities.find(c => c.slug === a);
    const cityB = cities.find(c => c.slug === b);
    const orderA = cityA ? cities.indexOf(cityA) : 999;
    const orderB = cityB ? cities.indexOf(cityB) : 999;
    
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const hasListings = airbnbListings.length > 0;

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          AirBNB
        </h1>
        <p className="text-center text-lg md:text-xl text-neutral-600 font-inter mb-16 max-w-2xl mx-auto">
          Discover unique accommodations in Belgium's most beautiful cities
        </p>

        {!hasListings ? (
          <div className="mb-8 p-6 bg-[#1BDD95]/10 border-2 border-[#1BDD95] rounded-2xl">
            <p className="text-center text-neutral-700 font-inter">
              <strong>Coming Soon:</strong> We're currently setting up our AirBNB listings. Check back soon for available properties!
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {sortedCityKeys.map((cityKey) => {
              const cityListings = groupedByCity.get(cityKey) || [];
              const cityData = cityKey !== 'no-city'
                ? cities.find(c => c.slug === cityKey)
                : null;
              const cityName = cityData
                ? (cityData.name[locale] || cityData.name.nl || cityData.slug)
                : null;

              // Skip cities with no listings (shouldn't happen, but just in case)
              if (cityListings.length === 0) return null;

              return (
                <div key={cityKey} className="space-y-6">
                  {cityName && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-6 w-6 text-[#1BDD95]" />
                      <h2 className="text-3xl md:text-4xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
                        {cityName}
                      </h2>
                    </div>
                  )}
                  <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {cityListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="group flex h-full flex-col bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                      >
                        <div className="relative h-64 w-full overflow-hidden bg-neutral-200">
                          {listing.image_url ? (
                            <Image
                              src={listing.image_url}
                              alt={listing.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Home className="h-16 w-16 text-neutral-400" />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-br from-[#1BDD95]/20 to-neutral-300/20" />
                            </>
                          )}
                        </div>
                        <div className="flex-1 p-6 flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl md:text-2xl font-bold font-oswald uppercase tracking-tight text-neutral-900 flex-1">
                              {listing.title}
                            </h3>
                            {listing.city && (() => {
                              const listingCityData = cities.find(c => c.slug === listing.city);
                              const listingCityName = listingCityData
                                ? (listingCityData.name[locale] || listingCityData.name.nl || listingCityData.slug)
                                : listing.city;
                              return (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#1BDD95]/10 text-[#1BDD95] rounded-full text-xs font-oswald font-semibold uppercase tracking-wide whitespace-nowrap flex-shrink-0">
                                  <MapPin className="h-3 w-3" />
                                  {listingCityName}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="mt-auto pt-4 border-t border-neutral-200">
                            <div className="flex items-center justify-between">
                              <div>
                                {listing.price ? (
                                  <>
                                    <span className="text-2xl font-bold font-oswald text-[#1BDD95]">
                                      €{listing.price.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-neutral-500 font-inter ml-1">/ night</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-neutral-500 font-inter">Price on request</span>
                                )}
                              </div>
                              <a
                                href={listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/btn relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#1BDD95] rounded-full text-[#1BDD95] font-oswald font-bold text-xs uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
                              >
                                <div className="absolute inset-0 bg-[#1BDD95] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">
                                  View on AirBNB
                                </span>
                                <ArrowRight className="relative z-10 w-3 h-3 group-hover/btn:text-white transition-colors duration-300" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


