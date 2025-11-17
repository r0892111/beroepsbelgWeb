'use client';

import { useState } from 'react';
import { products } from '@/lib/data';
import { ProductCard } from '@/components/webshop/product-card';
import { Button } from '@/components/ui/button';

type CategoryFilter = 'All' | 'Book' | 'Merchandise' | 'Game';

export default function WebshopPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const categories: CategoryFilter[] = ['All', 'Book', 'Merchandise', 'Game'];

  const getCategoryLabel = (category: CategoryFilter) => {
    switch (category) {
      case 'All': return 'Alles';
      case 'Book': return 'Boeken';
      case 'Merchandise': return 'Merchandise';
      case 'Game': return 'Spellen';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5">
      <div className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#0d1117]">Webshop</h1>
          <p className="mt-4 text-lg text-[#6b7280]">Ontdek onze collectie boeken, merchandise en spellen</p>
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
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'producten'}
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
