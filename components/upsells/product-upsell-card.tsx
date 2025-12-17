import Link from 'next/link';
import { type Product, type Locale } from '@/lib/data/types';
import { ShoppingBag } from 'lucide-react';

interface ProductUpsellCardProps {
  product: Product;
  locale: Locale;
}

export function ProductUpsellCard({ product, locale }: ProductUpsellCardProps) {
  return (
    <Link
      href={`/${locale}/webshop#${product.slug}`}
      className="group block relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--primary-base)' }}>
              {product.category}
            </div>
            <h3 className="font-semibold text-lg leading-tight group-hover:text-[var(--primary-base)] transition-colors" style={{ color: 'var(--text-primary)' }}>
              {product.title[locale]}
            </h3>
          </div>
          <span className="text-lg font-bold whitespace-nowrap" style={{ color: 'var(--primary-base)' }}>
            €{product.price.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <ShoppingBag className="w-4 h-4" />
          <span>View in webshop</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
        style={{ backgroundColor: 'var(--primary-base)' }}
      />
    </Link>
  );
}
