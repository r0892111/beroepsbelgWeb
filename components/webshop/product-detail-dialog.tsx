'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Book, Gamepad2, Package, X } from 'lucide-react';
import { Product } from '@/lib/data/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';
import { getProductPlaceholder } from '@/lib/utils/placeholder-images';

interface ProductDetailDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({ product, open, onOpenChange }: ProductDetailDialogProps) {
  const t = useTranslations('auth');
  const tProduct = useTranslations('product');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as 'nl' | 'en' | 'fr' | 'de';
  const { user } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesContext();
  const { addToCart } = useCartContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

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
        return <Book className="h-5 w-5" />;
      case 'Game':
        return <Gamepad2 className="h-5 w-5" />;
      case 'Merchandise':
        return <Package className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-brass">{getCategoryIcon()}</span>
                <span className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                  {product.category}
                </span>
              </div>
              <DialogTitle className="text-2xl leading-tight pr-8">
                {product.title[locale]}
              </DialogTitle>
              <div className="mt-3 flex items-center gap-3">
                <p className="text-3xl font-bold text-[#0d1117]">€{product.price.toFixed(2)}</p>
                {product.label && (
                  <span className="rounded-full bg-[#92F0B1] px-3 py-1 text-xs font-semibold text-[#0d1117]">
                    {product.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg border border-[#1a3628]/10 mb-6">
          <Image
            src={product.image || getProductPlaceholder(product.category)}
            alt={product.title[locale]}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{tProduct('description')}</h3>
            <DialogDescription className="text-base leading-relaxed whitespace-pre-line">
              {product.description[locale]}
            </DialogDescription>
          </div>

          {product.additionalInfo && product.additionalInfo[locale] && (
            <div>
              <h3 className="text-lg font-semibold mb-2">{tProduct('productInfo')}</h3>
              <DialogDescription className="text-base leading-relaxed whitespace-pre-line">
                {product.additionalInfo[locale]}
              </DialogDescription>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleToggleFavorite}
            className={`gap-2 ${isFavorite(product.slug) ? 'text-red-500 border-red-500' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite(product.slug) ? 'fill-current' : ''}`} />
            {isFavorite(product.slug) ? tProduct('inFavorites') : tProduct('addToFavorites')}
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className="flex-1 bg-[#0d1117] hover:bg-[#0d1117]/90 gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {t('addToCart')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
