'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/api/content';
import type { Product, Tour, Locale } from '@/lib/data/types';
import { ProductCard } from '@/components/webshop/product-card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import { Compass } from 'lucide-react';

type CategoryFilter = 'All' | 'Book' | 'Merchandise' | 'Game';

export default function WebshopPage() {
  const t = useTranslations('webshop');
  const tAuth = useTranslations('auth');
  const params = useParams();
  const locale = params.locale as Locale;
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const data = await getProducts();
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
    if (selectedCategory === 'All') {
      return products;
    }
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

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
      <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()}>{tAuth('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5">
      <div className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#0d1117]">{t('title')}</h1>
          <p className="mt-4 text-lg text-[#6b7280]">{t('subtitle')}</p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={selectedCategory === category
                ? 'bg-[#0d1117] hover:bg-[#0d1117]/90'
                : 'border-[#0d1117] text-[#0d1117] hover:bg-[#0d1117]/10'}
            >
              {getCategoryLabel(category)}
            </Button>
          ))}
        </div>

        <div className="mb-4 text-center text-sm text-muted-foreground">
          {t('productCount', { count: filteredProducts.length })}
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        {featuredTours.length > 0 && (
          <div className="mt-24 py-16 px-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Compass className="w-6 h-6" style={{ color: 'var(--primary-base)' }} />
                <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                  Experience Belgium Live
                </h2>
              </div>
              <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>
                Love what you see? Explore Belgium's hidden stories with our expert-guided tours
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {featuredTours.map((tour) => (
                <TourUpsellCard key={tour.id} tour={tour} locale={locale} />
              ))}
            </div>

            <div className="text-center">
              <Button asChild size="lg" style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}>
                <Link href={`/${locale}/tours`}>
                  Browse All Tours
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
