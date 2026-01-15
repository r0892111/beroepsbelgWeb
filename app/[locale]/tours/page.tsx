import { type Locale, locales } from '@/i18n';
import { getCities } from '@/lib/api/content';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Stadsgids België | Rondleidingen Antwerpen, Brussel, Brugge, Gent',
    description: 'Zoek je een stadsgids? Boek professionele stadswandelingen in Antwerpen, Brussel, Brugge, Gent, Mechelen en Leuven. Ervaren gidsen, unieke verhalen.',
  },
  en: {
    title: 'City Guide Belgium | Tours in Antwerp, Brussels, Bruges, Ghent',
    description: 'Looking for a city guide? Book professional city tours in Antwerp, Brussels, Bruges, Ghent, Mechelen and Leuven. Experienced guides, unique stories.',
  },
  fr: {
    title: 'Guide de Ville Belgique | Visites à Anvers, Bruxelles, Bruges, Gand',
    description: 'Vous cherchez un guide de ville? Réservez des visites guidées professionnelles à Anvers, Bruxelles, Bruges, Gand, Malines et Louvain.',
  },
  de: {
    title: 'Stadtführer Belgien | Touren in Antwerpen, Brüssel, Brügge, Gent',
    description: 'Sie suchen einen Stadtführer? Buchen Sie professionelle Stadtführungen in Antwerpen, Brüssel, Brügge, Gent, Mecheln und Löwen.',
  },
};

interface ToursPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: ToursPageProps): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/tours`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/tours`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/tours`,
      languages,
    },
  };
}

export default async function ToursPage({ params }: ToursPageProps) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const cities = await getCities();
  
  
  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section with Green Background */}
      <div className="bg-[#1BDD95] pt-10 md:pt-14 pb-32 md:pb-40 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-white">
            {t('toursPageTitle')}
          </h1>
          <p className="text-center text-lg md:text-xl text-white/90 font-inter max-w-2xl mx-auto">
            {t('toursPageTagline')}
          </p>
        </div>
      </div>

      {/* City Cards Section - subtle overlap with shadow touching green */}
      <div className="px-4 md:px-8 -mt-24 md:-mt-32 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-8 md:gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
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
                      href={`/${locale}/tours/${city.slug}`}
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
                      {city.comingSoonText?.[locale] || t('comingSoon')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
