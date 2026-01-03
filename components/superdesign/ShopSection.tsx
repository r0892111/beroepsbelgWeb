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
import Image from 'next/image';
import { ShoppingCart, Heart, Book, Gamepad2, Package } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Product, Locale } from '@/lib/data/types';

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
  description?: string;
  additionalInfo?: string;
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
  buttonClassName = "text-xs md:text-sm",
  onClick
}: { 
  product: DisplayProduct, 
  aspect?: string, 
  showSubtitle?: boolean,
  className?: string,
  imageClassName?: string,
  buttonClassName?: string,
  onClick?: () => void
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

  const getCategoryIcon = () => {
    const categoryUpper = product.category?.toUpperCase() || '';
    if (categoryUpper.includes('BOOK')) {
      return <Book className="h-4 w-4" />;
    } else if (categoryUpper.includes('GAME')) {
      return <Gamepad2 className="h-4 w-4" />;
    } else if (categoryUpper.includes('MERCH') || categoryUpper.includes('MERCHANDISE')) {
      return <Package className="h-4 w-4" />;
    }
    return null;
  };

  // Parse price to number for display
  const priceNumber = parseFloat(product.price.replace('€', '').replace(',', '.')) || 0;

  return (
    <Card
      className={`flex flex-col group overflow-hidden cursor-pointer h-full ${className}`}
      style={{
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid var(--border-subtle)',
      }}
      onClick={onClick}
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
                {product.category || 'Product'}
              </span>
            </div>
            <CardTitle
              className="text-lg leading-tight"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                color: 'var(--text-primary)'
              }}
            >
              {product.title}
            </CardTitle>
            {showSubtitle && product.subtitle && (
              <CardDescription className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {product.subtitle}
              </CardDescription>
            )}
            <CardDescription
              className="mt-2 font-bold text-lg"
              style={{ color: 'var(--primary-base)' }}
            >
              {product.price}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(e);
            }}
            className={`transition-all duration-300 ${isFavorite(product.uuid) ? 'text-red-500' : 'hover:bg-transparent'}`}
          >
            <Heart className={`h-5 w-5 ${isFavorite(product.uuid) ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className="flex-1 flex flex-col"
        style={{ backgroundColor: 'var(--card-content-bg)', paddingTop: '1.75rem', paddingBottom: '1.75rem' }}
      >
        <div className="relative w-full min-h-[200px] rounded-lg border border-[#1a3628]/10 mb-4 overflow-hidden flex items-center justify-center bg-gray-50">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              width={800}
              height={600}
              className="w-full h-auto max-h-[400px] object-contain group-hover:scale-105 transition-transform duration-300"
              unoptimized
              style={{ maxWidth: '100%' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-xs uppercase tracking-wider">No Image</span>
            </div>
          )}
        </div>
        {product.description && (
          <p
            className="text-sm line-clamp-3 leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {product.description}
          </p>
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
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart(e);
          }}
          disabled={isAddingToCart}
          className="w-full gap-2 transition-all duration-300"
          style={{
            backgroundColor: 'var(--primary-base)',
            color: 'white',
            boxShadow: 'var(--shadow-small)'
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          {tAuth('addToCart')}
        </Button>
      </CardFooter>
    </Card>
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
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // Fetch featured products from webshop_data table
        const { data, error: fetchError } = await supabase
          .from('webshop_data')
          .select('uuid, Name, Category, "Price (EUR)", Description, "Additional Info", product_images')
          .eq('featured_on_homepage', true)
          .order('homepage_featured_order', { ascending: true, nullsFirst: false })
          .order('Name', { ascending: true });

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
            description: product.Description || '',
            additionalInfo: product['Additional Info'] || '',
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

  const handleProductClick = (displayProduct: DisplayProduct) => {
    router.push(`/${locale}/webshop/${displayProduct.id}`);
  };

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
        <p className="font-sans text-[rgb(23,23,23)] uppercase tracking-widest text-sm md:text-base max-w-md mx-auto mb-6">
          {t('exclusiveItems')}
        </p>
        <Link href={`/${locale}/webshop`}>
          <Button
            className="inline-flex items-center justify-center px-8 py-4 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {t('viewAllProducts') || 'View All Products'}
          </Button>
        </Link>
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
                onClick={() => handleProductClick(product)}
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
