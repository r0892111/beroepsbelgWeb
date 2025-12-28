'use client';

/**
 * The ShopSection component displaying a curated collection.
 * Style: Pixel-perfect Modern Editorial Layout
 * - Simple 2x4 Grid Roster
 * - Clean typography
 * - Custom "Mint Brush Stroke" Separator with Shape Divider
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { toast } from 'sonner';

// --- Types ---
interface ProductImage {
  id: string;
  url: string;
  is_primary?: boolean;
  sort_order?: number;
}

interface WebshopProduct {
  uuid: string;
  Name: string;
  Category: string;
  "Price (EUR)": string;
  Description: string;
  "Additional Info": string;
  product_images?: ProductImage[] | null;
}

interface DisplayProduct {
  id: string;
  uuid: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: string;
  image: string;
}

// Helper function to generate slug from product name
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// --- Components ---

const Marquee = () => {
  const t = useTranslations('shop');
  return (
    <div className="w-full bg-[#1BDD95] overflow-hidden py-4 border-t border-[#1BDD95]">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
      >
        {[...Array(8)].map((_, i) => (
          <span key={i} className="text-[#F9F9F5] font-sans font-medium text-sm tracking-[0.2em] px-12">
            {t('marqueeText')}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const ProductCard = ({ 
  product, 
  aspect = "aspect-[3/4]", 
  showSubtitle = true,
  className = "",
  imageClassName = "",
  buttonClassName = "text-xs md:text-sm"
}: { 
  product: DisplayProduct, 
  aspect?: string, 
  showSubtitle?: boolean,
  className?: string,
  imageClassName?: string,
  buttonClassName?: string
}) => {
  const t = useTranslations('shop');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuth();
  const { addToCart } = useCartContext();
  const { isFavorite, addFavorite, removeFavorite, refetch: refetchFavorites, loading: favoritesLoading } = useFavoritesContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Ensure favorites are fetched when user is available or when component mounts
  useEffect(() => {
    if (user) {
      // Refetch favorites to ensure they're up to date
      refetchFavorites();
    }
  }, [user]); // Only depend on user, refetchFavorites is stable

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    setIsAddingToCart(true);
    try {
      const result = await addToCart(product.uuid, 1);
      if (result.error) {
        toast.error(tAuth('failedToAddToCart') || 'Failed to add to cart');
      } else {
        toast.success(tAuth('addedToCart') || 'Added to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(tAuth('failedToAddToCart') || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    // Use UUID as product identifier (consistent with cart system)
    if (!product.uuid) {
      console.error('Cannot add favorite: product has no uuid');
      toast.error('Unable to add to favorites');
      return;
    }

    setIsTogglingFavorite(true);
    try {
      if (isFavorite(product.uuid)) {
        await removeFavorite(product.uuid);
        toast.success(tAuth('removeFromFavorites'));
      } else {
        await addFavorite(product.uuid);
        toast.success(tAuth('addedToFavorites'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsTogglingFavorite(false);
    }
  };
  return (
    <div className={`h-full bg-transparent ${className}`}>
      {/* Bordered Container - Wraps Image AND Text */}
      <div className="flex flex-col h-full border border-[#1a3628] bg-[#F0F0EB] p-4 group transition-all duration-300 hover:shadow-lg">
        {/* Image Container */}
        <div className={`relative w-full ${aspect} mb-4 overflow-hidden border border-[#1a3628]/10 ${imageClassName} bg-[#1a3628]/5`}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#1a3628]/30">
              <span className="text-xs uppercase tracking-wider">No Image</span>
            </div>
          )}
        </div>

        {/* Info Area - Now Inside */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Product Name */}
          <div className="text-sm font-sans font-medium text-[#1a3628] uppercase tracking-wide truncate">
            {product.title}
          </div>
          {/* Category */}
          {product.category && (
            <div className="text-xs font-sans font-normal text-[#1a3628]/70 uppercase tracking-wide truncate">
              {product.category}
            </div>
          )}
          {/* Subtitle if exists */}
          {showSubtitle && product.subtitle && (
            <div className="text-xs font-sans font-normal text-[#1a3628]/60 uppercase tracking-wide truncate">
              {product.subtitle}
            </div>
          )}
          
          <div className="flex justify-between items-end mt-2">
            <span className="font-sans font-bold text-[#1a3628] text-lg">{product.price}</span>
            <div className="flex gap-2">
              <button
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className={`${buttonClassName} bg-[#1BDD95] text-white p-2 hover:bg-[#14BE82] transition-colors rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${isFavorite(product.uuid) ? 'bg-red-500 hover:bg-red-600' : ''}`}
                aria-label={isFavorite(product.uuid) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={18} strokeWidth={2.5} className={isFavorite(product.uuid) ? 'fill-current' : ''} />
              </button>
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className={`${buttonClassName} bg-[#1BDD95] text-white p-2 hover:bg-[#14BE82] transition-colors rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Add to cart"
              >
                <ShoppingCart size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SeparatorWave Component
 * An organic, brush-stroke style wave that serves as the section separator.
 * It sits on top of the section (negative margin) and fills the gap with the section color.
 */
function SeparatorWave() {
  return (
    <div className="absolute top-0 left-0 w-full z-20 pointer-events-none -translate-y-[98%] leading-none">
      <svg 
        viewBox="0 0 1440 200" 
        preserveAspectRatio="none" 
        className="w-full h-auto min-h-[150px]"
      >
        <defs>
          <filter id="rough-edges-separator" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        
        {/* Filled Shape - Connects the background seamlessly to the section below */}
        {/* New "Asymmetric Wave" Path: Start Low -> Left Rise -> Center Dip -> Right High Arch -> Drop */}
        <path 
          d="M0,200 L0,160 C320,30 550,180 720,140 S1150,-20 1440,160 L1440,200 Z" 
          fill="#F9F9F5" 
          filter="url(#rough-edges-separator)"
        />

        {/* The Mint Green Brush Stroke on Top Edge - Follows the curve */}
        <path 
          d="M0,160 C320,30 550,180 720,140 S1150,-20 1440,160" 
          fill="none" 
          stroke="#1BDD95" 
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#rough-edges-separator)"
          className="opacity-90"
        />
      </svg>
    </div>
  );
}

export function ShopSection() {
  const t = useTranslations('shop');
  const locale = useLocale();
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // Fetch products from webshop_data table
        const { data, error: fetchError } = await supabase
          .from('webshop_data')
          .select('uuid, Name, Category, "Price (EUR)", Description, "Additional Info", product_images')
          .order('Name', { ascending: true })
          .limit(8); // Limit to 8 products for the grid

        if (fetchError) {
          console.error('Error fetching products:', fetchError);
          setError('Failed to load products');
          return;
        }

        // Transform database products to display format
        const displayProducts: DisplayProduct[] = (data || []).map((product: WebshopProduct, index: number) => {
          // Get primary image or first image from product_images
          let imageUrl = '';
          if (product.product_images && Array.isArray(product.product_images) && product.product_images.length > 0) {
            const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];
            imageUrl = primaryImage.url || '';
          }

          // Format price (European format: €21,94)
          const priceValue = parseFloat(product["Price (EUR)"]) || 0;
          const formattedPrice = priceValue > 0 
            ? `€${priceValue.toFixed(2).replace('.', ',')}` 
            : '€0,00';

          // Extract title and subtitle from Name
          // If Name contains " — " or " - ", split it; otherwise use full Name as title
          const nameParts = product.Name.split(/[—–-]/).map(s => s.trim());
          const title = nameParts[0] || product.Name;
          const subtitle = nameParts.length > 1 ? nameParts.slice(1).join(' — ') : '';
          
          // Generate slug from product name
          const productSlug = slugify(product.Name) || product.uuid;

          return {
            id: product.uuid,
            uuid: product.uuid,
            slug: productSlug,
            title: title.toUpperCase(),
            subtitle: subtitle.toUpperCase(),
            category: product.Category || '',
            price: formattedPrice,
            image: imageUrl,
          };
        });

        setProducts(displayProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    }

    void fetchProducts();
  }, [locale]);

  return (
    <section className="relative w-full bg-[#F9F9F5]">
      <SeparatorWave />

      {/* Intro Text - Padding adjusted to clear the wave */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 px-4 pt-32"
      >
        <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl text-[rgb(23,23,23)] mb-4 tracking-tight leading-[0.9]">
          {t('curated')} <br/>
          <span className="italic font-light">{t('collection')}</span>
        </h2>
        <p className="font-sans text-[rgb(23,23,23)] uppercase tracking-widest text-sm md:text-base max-w-md mx-auto">
          {t('exclusiveItems')}
        </p>
      </motion.div>

      {/* Product Grid - 2x4 Layout (4 cols on desktop) */}
      <div className="container mx-auto px-4 lg:px-8 mb-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[400px] bg-[#F0F0EB] border border-[#1a3628] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[#1a3628] font-sans">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#1a3628] font-sans">{t('noProducts') || 'No products available'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Marquee Banner */}
      <Marquee />
    </section>
  );
}
