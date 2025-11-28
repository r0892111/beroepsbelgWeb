'use client';

import { Product } from '@/lib/data/types';
import { ProductCard } from '@/components/webshop/product-card';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <section className="py-24 px-4 bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-[#92F0B1] mb-3 font-semibold">
            {t('inSpotlight')}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0d1117] mb-4">
            Featured Products
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover our carefully selected collection of Belgian cultural treasures
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
            <CarouselPrevious className="static translate-y-0 border-[#92F0B1] text-[#0d1117] hover:bg-[#92F0B1] hover:text-[#0d1117]" />
            <CarouselNext className="static translate-y-0 border-[#92F0B1] text-[#0d1117] hover:bg-[#92F0B1] hover:text-[#0d1117]" />
          </div>
        </Carousel>

        <div className="flex justify-center mt-12">
          <Button
            asChild
            size="lg"
            className="bg-[#92F0B1] hover:bg-[#7dd99d] text-[#0d1117] font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Link href={`/${locale}/webshop`}>
              {tCommon('goToWebshop')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
