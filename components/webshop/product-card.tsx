'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Book, Gamepad2, Package, Gift } from 'lucide-react';
import { Product } from '@/lib/data/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';
import { getProductPlaceholder } from '@/lib/utils/placeholder-images';

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

    // Use UUID as product identifier (consistent with cart system)
    if (isFavorite(product.uuid)) {
      await removeFavorite(product.uuid);
      toast.success(t('removeFromFavorites'));
    } else {
      await addFavorite(product.uuid);
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
      case 'GiftCard':
        return <Gift className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  // Check if this is a gift card
  const isGiftCard = product.category === 'GiftCard' || 
    (product as any).stripe_product_id === 'prod_TnrjY3dpMoUw4G';

  return (
    <>
      <Card
        className="flex flex-col group overflow-hidden cursor-pointer"
        style={{
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={() => router.push(`/${locale}/webshop/${product.uuid}`)}
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
              {/* Fixed height title area for consistent alignment */}
              <div className="h-[40px] md:h-[52px]">
                <CardTitle
                  className="text-base md:text-lg leading-tight line-clamp-2"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    color: 'var(--text-primary)'
                  }}
                >
                  {product.title[locale]}
                </CardTitle>
              </div>
              <CardDescription
                className="mt-2 font-bold text-lg"
                style={{ color: 'var(--primary-base)' }}
              >
                {isGiftCard ? '€10 - €200+' : `€${product.price.toFixed(2)}`}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click from triggering
                handleToggleFavorite();
              }}
              className={`transition-all duration-300 flex-shrink-0 ${isFavorite(product.uuid) ? 'text-red-500' : 'hover:bg-transparent'}`}
            >
              <Heart className={`h-5 w-5 ${isFavorite(product.uuid) ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent
          className="flex flex-col"
          style={{ backgroundColor: 'var(--card-content-bg)', paddingTop: '1.25rem', paddingBottom: '1rem' }}
        >
          {/* Fixed height image container - taller than square for book covers etc */}
          <div className="relative w-full h-[180px] md:h-[280px] rounded-lg border border-[#1a3628]/10 mb-4 overflow-hidden bg-gray-50">
            <Image
              src={product.image || getProductPlaceholder(product.category)}
              alt={product.title[locale]}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </div>
          {/* Fixed height description area to ensure text alignment across cards */}
          <div className="h-[54px] md:h-[72px]">
            <p
              className="text-sm line-clamp-3 leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {product.description[locale]}
            </p>
          </div>
          {/* Fixed height label area */}
          <div className="h-[20px] md:h-[24px] mt-1">
            {product.label && (
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--primary-lighter)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-small)'
                }}
              >
                {product.label}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter
          className="flex flex-col gap-2 px-6 pb-6 pt-4"
          style={{
            backgroundColor: 'var(--card-footer-bg)',
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <Button
            asChild
            variant="outline"
            className="w-full transition-all duration-300"
            style={{
              borderColor: 'var(--primary-base)',
              color: 'var(--primary-base)',
              backgroundColor: 'transparent'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/${locale}/webshop/${product.uuid}`}>Details</Link>
          </Button>
          {isGiftCard ? (
            <Button
              asChild
              className="w-full gap-2 transition-all duration-300 h-auto min-h-10 py-2 whitespace-normal text-center sm:whitespace-nowrap"
              style={{
                backgroundColor: 'var(--primary-base)',
                color: 'white',
                boxShadow: 'var(--shadow-small)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/${locale}/webshop/${product.uuid}`}>
                <Gift className="h-4 w-4 flex-shrink-0" />
                Kies bedrag
              </Link>
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click from triggering
                handleAddToCart();
              }}
              disabled={isAddingToCart}
              className="w-full gap-2 transition-all duration-300 h-auto min-h-10 py-2 whitespace-normal text-center sm:whitespace-nowrap"
              style={{
                backgroundColor: 'var(--primary-base)',
                color: 'white',
                boxShadow: 'var(--shadow-small)'
              }}
            >
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              {t('addToCart')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
