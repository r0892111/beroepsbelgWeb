'use client';

import { useState, useEffect } from 'react';
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
import { ProductImageGallery } from './product-image-gallery';
import { supabase } from '@/lib/supabase/client';
import type { ProductImage } from '@/lib/data/types';

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
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Fetch product images when dialog opens
  useEffect(() => {
    if (open && product.uuid) {
      setLoadingImages(true);
      supabase
        .from('webshop_data')
        .select('product_images')
        .eq('uuid', product.uuid)
        .single()
        .then(({ data, error }) => {
          if (!error && data && data.product_images && Array.isArray(data.product_images)) {
            setProductImages(data.product_images.map((img: any, index: number) => ({
              id: img.id || `${product.uuid}-${index}`,
              product_uuid: product.uuid,
              image_url: img.url || img.image_url,
              is_primary: img.is_primary || false,
              sort_order: img.sort_order !== undefined ? img.sort_order : index,
              storage_folder_name: img.storage_folder_name || undefined,
              created_at: img.created_at,
              updated_at: img.updated_at,
            })).sort((a, b) => a.sort_order - b.sort_order));
          } else {
            setProductImages([]);
          }
          setLoadingImages(false);
        });
    } else {
      setProductImages([]);
    }
  }, [open, product.uuid]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

        {/* Image Gallery */}
        {productImages.length > 0 ? (
          <ProductImageGallery
            images={productImages}
            productName={product.title[locale]}
            fallbackImage={product.image || getProductPlaceholder(product.category)}
          />
        ) : (
          <div className="relative w-full min-h-[300px] rounded-lg border border-[#1a3628]/10 mb-6 overflow-hidden flex items-center justify-center bg-gray-50 group cursor-zoom-in"
            onClick={() => {
              const img = product.image || getProductPlaceholder(product.category);
              // Open in new tab for zoom (simple approach)
              window.open(img, '_blank');
            }}
          >
            <Image
              src={product.image || getProductPlaceholder(product.category)}
              alt={product.title[locale]}
              width={1200}
              height={1200}
              className="w-full h-auto max-h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
              unoptimized
              style={{ maxWidth: '100%' }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none">
              <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </div>
        )}

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
            className={`gap-2 ${isFavorite(product.uuid) ? 'text-red-500 border-red-500' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite(product.uuid) ? 'fill-current' : ''}`} />
            {isFavorite(product.uuid) ? tProduct('inFavorites') : tProduct('addToFavorites')}
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
