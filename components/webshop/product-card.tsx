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
      await addToCart(product.slug, 1);
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
      <Card className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDialog(true)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-brass">{getCategoryIcon()}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {product.category}
                </span>
              </div>
              <CardTitle className="text-lg leading-tight">{product.title[locale]}</CardTitle>
              <CardDescription className="mt-2 font-semibold text-lg">€{product.price.toFixed(2)}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className={isFavorite(product.slug) ? 'text-red-500' : ''}
            >
              <Heart className={`h-5 w-5 ${isFavorite(product.slug) ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {product.description[locale]}
          </p>
          {product.label && (
            <span className="inline-block mt-3 rounded-full bg-[#92F0B1] px-3 py-1 text-xs font-semibold text-[#0d1117]">
              {product.label}
            </span>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={isAddingToCart}
            className="w-full bg-[#0d1117] hover:bg-[#0d1117]/90 gap-2"
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
