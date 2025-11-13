'use client';

import { products } from '@/lib/data';
import { ProductCard } from '@/components/webshop/product-card';

export default function WebshopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5">
      <div className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#0d1117]">Webshop</h1>
          <p className="mt-4 text-lg text-[#6b7280]">Discover our curated selection of Belgian guides and products</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
