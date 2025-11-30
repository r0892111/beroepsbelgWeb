'use client';

import { Product } from '@/lib/data/types';
import { ProductCard } from '@/components/webshop/product-card';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface SpotlightCarouselProps {
  products: Product[];
}

export function SpotlightCarousel({ products }: SpotlightCarouselProps) {
  const t = useTranslations('sections');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;

  return (
    <section className="py-20 md:py-32 relative overflow-hidden" style={{ backgroundColor: 'var(--white)' }}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 20s ease-in-out infinite'
          }}
        />
        <div
          className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 25s ease-in-out infinite reverse'
          }}
        />
        <div
          className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-5"
          style={{
            backgroundColor: 'var(--green-accent)',
            filter: 'blur(80px)',
            animation: 'float 30s ease-in-out infinite'
          }}
        />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative" style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20 relative">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--green-accent)' }}>
              {t('inSpotlight')}
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}>
              {t('featuredProducts')}
            </h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto font-light" style={{ fontFamily: 'Open Sans, sans-serif', color: 'var(--text-secondary)' }}>
              {t('featuredProductsDesc')}
            </p>
          </div>

          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {products.map((product) => (
                <CarouselItem key={product.uuid} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-4 mt-8">
              <CarouselPrevious className="static translate-y-0 border-[var(--green-accent)] text-[#0d1117] hover:bg-[var(--green-accent)] hover:text-white transition-all duration-300" />
              <CarouselNext className="static translate-y-0 border-[var(--green-accent)] text-[#0d1117] hover:bg-[var(--green-accent)] hover:text-white transition-all duration-300" />
            </div>
          </Carousel>

          <div className="mt-16 md:mt-20 text-center relative">
            <div className="inline-block relative group">
              {/* Animated turquoise glow */}
              <div
                className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Link
                href={`/${locale}/webshop`}
                className="btn-primary relative inline-flex items-center gap-2 px-8 py-4 font-semibold text-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
                style={{
                  backgroundColor: 'var(--green-accent)',
                  color: 'white',
                  borderRadius: '9999px',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                {tCommon('goToWebshop')}
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
