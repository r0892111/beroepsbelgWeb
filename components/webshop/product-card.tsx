'use client';

import { useState } from 'react';
import { ProductDetailDialog } from './product-detail-dialog';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Book, Gamepad2, Package } from 'lucide-react';
import { Product } from '@/lib/data/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as 'nl' | 'en' | 'fr' | 'de';
  const { user } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesContext();
  const { addToCart } = useCartContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    if (isFavorite(product.slug)) {
      await removeFavorite(product.slug);
      toast.success(t('removeFromFavorites'));
    } else {
      await addFavorite(product.slug);
      toast.success(t('addedToFavorites'));
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    setIsAddingToCart(true);
    try {
      // Use UUID instead of slug for cart_items.product_id
      await addToCart(product.uuid, 1);
      toast.success(t('addedToCart'));
    } catch (error) {
      toast.error(t('failedToAddToCart'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getCategoryIcon = () => {
    switch (product.category) {
      case 'Book':
        return <Book className="h-4 w-4" />;
      case 'Game':
        return <Gamepad2 className="h-4 w-4" />;
      case 'Merchandise':
        return <Package className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card
        className="flex flex-col group overflow-hidden"
        style={{
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-hover-glow)';
          e.currentTarget.style.borderColor = 'var(--border-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
        <CardHeader
          style={{
            backgroundColor: 'var(--card-header-bg)',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: 'var(--primary-base)' }}>{getCategoryIcon()}</span>
                <span
                  className="text-xs uppercase tracking-wide font-semibold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {product.category}
                </span>
              </div>
              <CardTitle
                className="text-lg leading-tight"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  color: 'var(--text-primary)'
                }}
              >
                {product.title[locale]}
              </CardTitle>
              <CardDescription
                className="mt-2 font-bold text-lg"
                style={{ color: 'var(--primary-base)' }}
              >
                €{product.price.toFixed(2)}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className={`transition-all duration-300 ${isFavorite(product.slug) ? 'text-red-500' : 'hover:bg-transparent'}`}
            >
              <Heart className={`h-5 w-5 ${isFavorite(product.slug) ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent
          className="flex-1 flex flex-col justify-center"
          style={{ backgroundColor: 'var(--card-content-bg)', paddingTop: '1.75rem', paddingBottom: '1.75rem' }}
        >
          <p
            className="text-sm line-clamp-3 leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {product.description[locale]}
          </p>
          {product.label && (
            <span
              className="inline-block mt-3 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--primary-lighter)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-small)'
              }}
            >
              {product.label}
            </span>
          )}
        </CardContent>
        <CardFooter
          className="flex flex-col gap-2 px-6 pb-6 pt-4"
          style={{
            backgroundColor: 'var(--card-footer-bg)',
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <Button
            onClick={() => setShowDialog(true)}
            variant="outline"
            className="w-full transition-all duration-300"
            style={{
              borderColor: 'var(--primary-base)',
              color: 'var(--primary-base)',
              backgroundColor: 'transparent'
            }}
          >
            Details
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className="w-full gap-2 transition-all duration-300"
            style={{
              backgroundColor: 'var(--primary-base)',
              color: 'white',
              boxShadow: 'var(--shadow-small)'
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            {t('addToCart')}
          </Button>
        </CardFooter>
      </Card>

      <ProductDetailDialog
        product={product}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  );
}
