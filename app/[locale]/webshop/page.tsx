'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
// Removed direct import - will fetch from API instead
import type { Product, Tour, Locale } from '@/lib/data/types';
import { ProductCard } from '@/components/webshop/product-card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import { Compass, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

type CategoryFilter = 'All' | 'Book' | 'Merchandise' | 'Game';

export default function WebshopPage() {
  const t = useTranslations('webshop');
  const tAuth = useTranslations('auth');
  const params = useParams();
  const locale = params.locale as Locale;
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (!isMounted) return;
        setProducts(data);
        setError(null);
      } catch (err) {
        console.error('[WebshopPage] Failed to load products', err);
        if (isMounted) {
          setError(t('loadError'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function loadFeaturedTours() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const toursRes = await fetch(`${supabaseUrl}/rest/v1/tours_table_prod?limit=3&select=*`, {
          headers: {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        });

        if (toursRes.ok && isMounted) {
          const toursData = await toursRes.json();
          const mappedTours = toursData.map((row: any) => ({
            id: row.id,
            city: row.city?.toLowerCase() || '',
            slug: row.title.toLowerCase().replace(/\s+/g, '-'),
            title: row.title,
            type: row.type,
            durationMinutes: row.duration_minutes,
            price: row.price ? Number(row.price) : undefined,
            startLocation: row.start_location,
            endLocation: row.end_location,
            languages: row.languages || [],
            description: row.description,
            options: row.options,
          }));
          setFeaturedTours(mappedTours);
        }
      } catch (err) {
        console.error('[WebshopPage] Failed to load tours', err);
      }
    }

    void loadProducts();
    void loadFeaturedTours();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const title = p.title[locale]?.toLowerCase() || '';
        const description = p.description[locale]?.toLowerCase() || '';
        const category = p.category?.toLowerCase() || '';
        return (
          title.includes(query) ||
          description.includes(query) ||
          category.includes(query)
        );
      });
    }

    return filtered;
  }, [products, selectedCategory, searchQuery, locale]);

  const categories: CategoryFilter[] = ['All', 'Book', 'Merchandise', 'Game'];

  const getCategoryLabel = (category: CategoryFilter) => {
    switch (category) {
      case 'All': return t('all');
      case 'Book': return t('books');
      case 'Merchandise': return t('merchandise');
      case 'Game': return t('games');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <p className="text-neutral-600 font-inter">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-inter">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-8 py-4 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105"
          >
            {tAuth('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section with Green Background */}
      <div className="bg-[#1BDD95] pt-10 md:pt-14 pb-40 md:pb-52 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-inter max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Content Section - overlaps the green */}
      <div className="container mx-auto px-4 md:px-8 -mt-32 md:-mt-44 pb-16 md:pb-24">
        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 py-6 text-lg bg-white border-2 border-neutral-200 rounded-full focus:border-[#1BDD95] focus:ring-2 focus:ring-[#1BDD95]/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-16 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full font-oswald font-bold text-sm uppercase tracking-widest transition-all ${
                selectedCategory === category
                  ? 'bg-[#1BDD95] text-white shadow-lg hover:bg-[#14BE82] hover:scale-105 border border-white/30'
                  : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        {featuredTours.length > 0 && (
          <div className="mt-24 py-16 px-6 md:px-12 rounded-3xl bg-white shadow-lg">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
                  {t('experienceBelgiumLive')}
                </h2>
              </div>
              <p className="text-base md:text-lg max-w-2xl mx-auto text-neutral-600 font-inter">
                {t('exploreHiddenStories')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {featuredTours.map((tour) => (
                <TourUpsellCard key={tour.id} tour={tour} locale={locale} />
              ))}
            </div>

            <div className="text-center">
              <Link
                href={`/${locale}/tours`}
                className="inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {t('browseAllTours')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
