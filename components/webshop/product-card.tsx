'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart } from 'lucide-react';
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
      toast.success('Added to favorites');
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
      toast.success(t('addToCart'));
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.title[locale]}</CardTitle>
            <CardDescription className="mt-1">€{product.price.toFixed(2)}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className={isFavorite(product.slug) ? 'text-red-500' : ''}
          >
            <Heart className={`h-5 w-5 ${isFavorite(product.slug) ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {product.label && (
          <span className="inline-block rounded-full bg-[#92F0B1] px-3 py-1 text-xs font-semibold text-[#0d1117]">
            {product.label}
          </span>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="w-full bg-[#0d1117] hover:bg-[#0d1117]/90 gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {t('addToCart')}
        </Button>
      </CardFooter>
    </Card>
  );
}
