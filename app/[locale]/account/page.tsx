'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useTourFavoritesContext } from '@/lib/contexts/tour-favorites-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ShoppingCart, User, LogOut, Package, Trash2, Plus, Minus, Calendar, Receipt, MapPin, Globe, Settings } from 'lucide-react';
// Removed direct import - will fetch from API instead
import type { Product } from '@/lib/data/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { ProductDetailDialog } from '@/components/webshop/product-detail-dialog';
import { CheckoutDialog } from '@/components/webshop/checkout-dialog';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { getProductPlaceholder } from '@/lib/utils/placeholder-images';

export default function AccountPage() {
  const t = useTranslations('auth');
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const { favorites, favoritesCount, removeFavorite } = useFavoritesContext();
  const { favorites: tourFavorites, tourFavoritesCount, removeTourFavorite, loading: tourFavoritesLoading } = useTourFavoritesContext();
  const { cartItems, cartCount, updateQuantity, removeFromCart, addToCart } = useCartContext();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'cart' ? 'cart' : 'favorites');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [allTours, setAllTours] = useState<any[]>([]);
  const [allToursLoading, setAllToursLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tours, setTours] = useState<Map<string, any>>(new Map());
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);

  const handleLanguageChange = async (newLanguage: 'nl' | 'en' | 'fr' | 'de') => {
    if (!user) return;
    setSavingLanguage(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: newLanguage })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(t('languageSaved') || 'Language preference saved');
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error(t('languageSaveError') || 'Could not save language preference');
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleProductClick = (product: Product) => {
    router.push(`/${locale}/webshop/${product.uuid}`);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (!isMounted) return;
        setProducts(data);
        setProductsError(null);
      } catch (error) {
        if (isMounted) {
          setProductsError(t('couldNotLoadProducts'));
        }
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load all tours at startup (like products)
  useEffect(() => {
    let isMounted = true;

    // Slugify function matching the one in lib/api/content.ts
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    async function loadAllTours() {
      try {
        const { data, error } = await supabase
          .from('tours_table_prod')
          .select('id, title, city, type, duration_minutes, price, tour_images, description')
          .eq('status', 'published'); // Only show published tours

        if (error) throw error;
        if (!isMounted) return;
        
        // Map the data to include computed fields
        const mappedTours = (data || []).map((tour: any) => {
          // Extract image URL from tour_images JSONB array
          let imageUrl = null;
          if (Array.isArray(tour.tour_images) && tour.tour_images.length > 0) {
            // Find primary image first, then fall back to first image
            const primaryImage = tour.tour_images.find((img: any) => img.is_primary) || tour.tour_images[0];
            imageUrl = primaryImage?.url || primaryImage?.image_url || null;
          }
          
          return {
            ...tour,
            // Generate slug from title using same logic as getTourBySlug
            slug: slugify(tour.title || ''),
            // Extracted image URL
            image: imageUrl,
          };
        });
        
        setAllTours(mappedTours);
      } catch (error) {
        console.error('Error loading tours:', error);
      } finally {
        if (isMounted) {
          setAllToursLoading(false);
        }
      }
    }

    void loadAllTours();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (tabFromUrl === 'cart' || tabFromUrl === 'favorites' || tabFromUrl === 'orders' || tabFromUrl === 'tours' || tabFromUrl === 'settings') {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders' && user) {
      fetchOrders();
    }
  }, [activeTab, user]);

  // Fetch bookings and tours when tours tab is active
  useEffect(() => {
    if (activeTab === 'tours' && user) {
      fetchBookings();
      fetchTours();
    }
  }, [activeTab, user]);


  const fetchTours = async () => {
    try {
      const { data, error } = await supabase
        .from('tours_table_prod')
        .select('id, title, city, type, duration_minutes, price');

      if (error) throw error;

      const toursMap = new Map<string, any>();
      (data || []).forEach((tour: any) => {
        toursMap.set(tour.id, tour);
      });
      setTours(toursMap);
    } catch (error) {
      console.error('Error fetching tours:', error);
    }
  };


  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      console.log('Fetching orders for user:', user.id);
      const { data, error } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      console.log('Orders fetched:', data?.length || 0, 'orders');
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(t('couldNotLoadOrders') || 'Could not load orders');
      // If RLS error, show more helpful message
      if (error?.message?.includes('permission') || error?.code === '42501') {
        console.error('RLS policy error - user may not have permission to view orders');
      }
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    setBookingsLoading(true);
    try {
      console.log('Fetching bookings for user:', user.id, 'email:', user.email);
      
      // Try to fetch by user_id first (most efficient)
      let query = supabase
        .from('tourbooking')
        .select('*')
        .order('tour_datetime', { ascending: false })
        .limit(100);

      // If user_id column exists, filter by it
      const { data: userBookings, error: userError } = await query
        .eq('user_id', user.id);

      if (!userError && userBookings && userBookings.length > 0) {
        console.log('Found bookings by user_id:', userBookings.length);
        setBookings(userBookings);
        setBookingsLoading(false);
        return;
      }

      // If no bookings found by user_id, try fetching all and filtering by email
      console.log('No bookings by user_id, trying email filter...');
      const { data: allBookings, error: allError } = await supabase
        .from('tourbooking')
        .select('*')
        .order('tour_datetime', { ascending: false })
        .limit(100);

      if (allError) throw allError;

      // Filter bookings where user email is in invitees
      const userEmail = user.email || profile?.email;
      const filteredBookings = (allBookings || []).filter((booking: any) => {
        // Check if user_id matches (in case it was set)
        if (booking.user_id && booking.user_id === user.id) return true;
        
        // Check if user email is in invitees
        if (booking.invitees && Array.isArray(booking.invitees) && userEmail) {
          return booking.invitees.some((invitee: any) => 
            invitee.email && invitee.email.toLowerCase() === userEmail.toLowerCase()
          );
        }
        
        return false;
      });

      console.log('Found bookings by email:', filteredBookings.length);
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(t('couldNotLoadBookings') || 'Could not load bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/sign-in`);
    }
  }, [user, authLoading, router, locale]);

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('signOutSuccess'));
    router.push(`/${locale}`);
  };

  if (authLoading || !user || productsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#92F0B1] border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">{productsError}</p>
          <Button onClick={() => window.location.reload()}>{t('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  const favoriteProducts = products.filter((p) =>
    favorites.some((fav) => fav.product_id === p.uuid)
  );

  // Compute favorite tours by filtering allTours (like favoriteProducts)
  // Both tour.id and fav.tour_id are UUIDs stored as strings
  const favoriteTours = allTours.filter((tour) =>
    tourFavorites.some((fav) => String(fav.tour_id) === String(tour.id))
  );

  // Use cart items directly - they already have products populated from JOIN
  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.products?.price || 0) * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-[#0d1117]">{t('accountTitle')}</h1>
              <p className="text-lg text-[#6b7280]">
                {profile?.full_name || profile?.email}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('signOut')}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myFavorites')}</span>
                <span className="sm:hidden">{t('favorites') || 'Favorites'}</span>
                {(favoritesCount + tourFavoritesCount) > 0 && (
                  <span className="ml-1 rounded-full bg-[#92F0B1] px-2 py-0.5 text-xs text-[#0d1117]">
                    {favoritesCount + tourFavoritesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cart" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myCart')}</span>
                <span className="sm:hidden">{t('cart') || 'Cart'}</span>
                {cartItems.length > 0 && (
                  <span className="ml-1 rounded-full bg-[#92F0B1] px-2 py-0.5 text-xs text-[#0d1117]">
                    {cartCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myOrders') || 'My Orders'}</span>
                <span className="sm:hidden">{t('orders') || 'Orders'}</span>
              </TabsTrigger>
              <TabsTrigger value="tours" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myTours') || 'My Tours'}</span>
                <span className="sm:hidden">{t('tours') || 'Tours'}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings') || 'Settings'}</span>
                <span className="sm:hidden">{t('settings') || 'Settings'}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites">
              <div className="space-y-8">
                {/* Favorite Tours Section */}
                <div>
                  <h2 className="text-xl font-semibold text-[#0d1117] mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('favoriteTours') || 'Favoriete Tours'}
                    {tourFavoritesCount > 0 && (
                      <span className="rounded-full bg-[#92F0B1] px-2 py-0.5 text-xs text-[#0d1117]">
                        {tourFavoritesCount}
                      </span>
                    )}
                  </h2>
                  {(tourFavoritesLoading || allToursLoading) ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#92F0B1] border-t-transparent"></div>
                      </CardContent>
                    </Card>
                  ) : favoriteTours.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <MapPin className="mb-3 h-10 w-10 text-[#6b7280]" />
                        <p className="text-center text-[#6b7280]">{t('noFavoriteTours') || 'Nog geen favoriete tours'}</p>
                        <Button asChild className="mt-4 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]" size="sm">
                          <Link href={`/${locale}/tours`}>{t('browseTours') || 'Bekijk Tours'}</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {favoriteTours.map((tour) => (
                        <Card
                          key={tour.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                          onClick={() => router.push(`/${locale}/tours/${tour.city}/${tour.slug}`)}
                        >
                          <div className="relative w-full h-40 overflow-hidden">
                            {tour.image && /\.(mp4|webm|mov)$/i.test(tour.image) ? (
                              <video
                                src={tour.image}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                                aria-label={tour.title}
                              />
                            ) : (
                              <Image
                                src={tour.image || '/images/placeholder-tour.jpg'}
                                alt={tour.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            )}
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{tour.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span>{tour.city}</span>
                              {tour.price && <span>• €{Number(tour.price).toFixed(2)}</span>}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTourFavorite(tour.id);
                                toast.success(t('removeFromFavorites'));
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('removeFromFavorites')}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Favorite Products Section */}
                <div>
                  <h2 className="text-xl font-semibold text-[#0d1117] mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('favoriteProducts') || 'Favoriete Producten'}
                    {favoritesCount > 0 && (
                      <span className="rounded-full bg-[#92F0B1] px-2 py-0.5 text-xs text-[#0d1117]">
                        {favoritesCount}
                      </span>
                    )}
                  </h2>
                  {favoriteProducts.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <Package className="mb-3 h-10 w-10 text-[#6b7280]" />
                        <p className="text-center text-[#6b7280]">{t('noFavoriteProducts') || 'Nog geen favoriete producten'}</p>
                        <Button asChild className="mt-4 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]" size="sm">
                          <Link href={`/${locale}/webshop`}>{t('browseProducts')}</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {favoriteProducts.map((product) => (
                        <Card key={product.slug} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => handleProductClick(product)}>
                          <div className="relative w-full h-40 overflow-hidden">
                            {product.image && /\.(mp4|webm|mov)$/i.test(product.image) ? (
                              <video
                                src={product.image}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                                aria-label={product.title[locale as 'nl' | 'en' | 'fr' | 'de']}
                              />
                            ) : (
                              <Image
                                src={product.image || getProductPlaceholder(product.category || 'Book')}
                                alt={product.title[locale as 'nl' | 'en' | 'fr' | 'de']}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            )}
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{product.title[locale as 'nl' | 'en' | 'fr' | 'de']}</CardTitle>
                            <CardDescription>€{product.price.toFixed(2)}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            <Button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await addToCart(product.uuid, 1);
                                toast.success(t('addToCart'));
                              }}
                              size="sm"
                              className="w-full gap-2 bg-[#0d1117] hover:bg-[#0d1117]/90"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              {t('addToCart')}
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(product.uuid);
                                toast.success(t('removeFromFavorites'));
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('removeFromFavorites')}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cart">
              {cartItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ShoppingCart className="mb-4 h-16 w-16 text-[#6b7280]" />
                    <h3 className="mb-2 text-xl font-semibold text-[#0d1117]">{t('emptyCart')}</h3>
                    <p className="mb-6 text-center text-[#6b7280]">{t('emptyCartDesc')}</p>
                    <Button asChild className="bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]">
                      <Link href={`/${locale}/webshop`}>{t('browseProducts')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const product = item.products;
                      // Find product in products array for dialog if needed
                      const productForDialog = product
                        ? products.find((p) =>
                            p.slug === product.slug
                          )
                        : null;
                      return (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                          onClick={() => productForDialog && handleProductClick(productForDialog)}
                        >
                          <CardContent className="flex items-center gap-4 p-6">
                            {(product?.image || product) && (
                              <div className="relative w-20 h-20 flex-shrink-0">
                                {product?.image && /\.(mp4|webm|mov)$/i.test(product.image) ? (
                                  <video
                                    src={product.image}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-full object-cover rounded"
                                    aria-label={(product as any)?.Name || (product as any)?.title_nl || 'Product'}
                                  />
                                ) : (
                                  <Image
                                    src={product?.image || getProductPlaceholder((product as any)?.Category || (product as any)?.category || 'Book')}
                                    alt={(product as any)?.Name || (product as any)?.title_nl || (product as any)?.title_en || 'Product'}
                                    fill
                                    className="object-cover rounded"
                                    unoptimized
                                  />
                                )}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#0d1117]">
                                {product?.Name || product?.title_nl || product?.title_en || product?.title_fr || product?.title_de || 'Product'}
                              </h3>
                              <p className="text-[#6b7280]">€{(product?.price || 0).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.product_id, item.quantity - 1);
                                  }}
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.product_id, item.quantity + 1);
                                  }}
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="w-24 text-right font-semibold">
                                €{((product?.price || 0) * item.quantity).toFixed(2)}
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(item.product_id);
                                  toast.success(t('removeFromCart'));
                                }}
                                variant="ghost"
                                size="icon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="bg-[#92F0B1]/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold">{t('total')}</span>
                        <span className="text-2xl font-bold text-[#0d1117]">€{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/${locale}/webshop`}>{t('continueShopping')}</Link>
                        </Button>
                        <Button 
                          className="flex-1 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]"
                          onClick={() => setCheckoutOpen(true)}
                        >
                          {t('checkout')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {ordersLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#92F0B1] border-t-transparent"></div>
                  </CardContent>
                </Card>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Receipt className="mb-4 h-16 w-16 text-[#6b7280]" />
                    <h3 className="mb-2 text-xl font-semibold text-[#0d1117]">{t('noOrders') || 'No Orders'}</h3>
                    <p className="mb-6 text-center text-[#6b7280]">{t('noOrdersDesc') || 'You haven\'t placed any orders yet.'}</p>
                    <Button asChild className="bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]">
                      <Link href={`/${locale}/webshop`}>{t('browseProducts')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{t('order') || 'Order'} #{String(order.id).slice(0, 8)}</CardTitle>
                            <CardDescription>
                              {new Date(order.created_at).toLocaleDateString(locale, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </CardDescription>
                          </div>
                          <Badge
                            className={
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                            <div>
                              <h4 className="mb-2 font-semibold">{t('orderItems') || 'Items'}:</h4>
                              <div className="space-y-2">
                                {order.items.map((item: any, index: number) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>
                                      {item.title} {item.quantity > 1 && `× ${item.quantity}`}
                                    </span>
                                    <span className="font-medium">€{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>{t('total')}:</span>
                          <span>€{order.total_amount ? Number(order.total_amount).toFixed(2) : order.amount_total ? (Number(order.amount_total) / 100).toFixed(2) : '0.00'}</span>
                        </div>
                        {order.shipping_address && (
                          <div className="rounded-lg bg-[#92F0B1]/10 p-3 text-sm">
                            <p className="font-semibold mb-1">{t('shippingAddress') || 'Shipping Address'}:</p>
                            <p>{order.shipping_address.street}</p>
                            <p>
                              {order.shipping_address.city}, {order.shipping_address.postalCode}
                            </p>
                            <p>{order.shipping_address.country}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tours">
              {bookingsLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#92F0B1] border-t-transparent"></div>
                  </CardContent>
                </Card>
              ) : bookings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <MapPin className="mb-4 h-16 w-16 text-[#6b7280]" />
                    <h3 className="mb-2 text-xl font-semibold text-[#0d1117]">{t('noBookings') || 'No Tour Bookings'}</h3>
                    <p className="mb-6 text-center text-[#6b7280]">{t('noBookingsDesc') || 'You haven\'t booked any tours yet.'}</p>
                    <Button asChild className="bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]">
                      <Link href={`/${locale}/tours`}>{t('browseTours') || 'Browse Tours'}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const tour = booking.tour_id ? tours.get(booking.tour_id) : null;
                    const isPast = booking.tour_datetime ? new Date(booking.tour_datetime) < new Date() : false;
                    
                    return (
                      <Card key={booking.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {tour?.title || booking.city || t('tourBooking') || 'Tour Booking'} #{booking.id}
                              </CardTitle>
                              <CardDescription>
                                {booking.tour_datetime
                                  ? new Date(booking.tour_datetime).toLocaleDateString(locale, {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : t('dateTBD') || 'Date TBD'}
                                {booking.city && ` • ${booking.city}`}
                                {tour && ` • ${tour.type}`}
                                {tour?.duration_minutes && ` • ${Math.floor(tour.duration_minutes / 60)}h ${tour.duration_minutes % 60}m`}
                              </CardDescription>
                            </div>
                            {isPast && (
                              <Badge variant="outline" className="text-xs">
                                {t('past') || 'Past'}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {tour && (
                            <div className="rounded-lg bg-[#92F0B1]/10 p-3 text-sm">
                              <p className="font-semibold mb-1">{t('tourDetails') || 'Tour Details'}:</p>
                              <p>{tour.title}</p>
                              {tour.price && (
                                <p className="text-muted-foreground">€{Number(tour.price).toFixed(2)}</p>
                              )}
                            </div>
                          )}
                          {booking.invitees && Array.isArray(booking.invitees) && booking.invitees.length > 0 && (
                            <div>
                              <h4 className="mb-2 font-semibold">{t('participants') || 'Participants'}:</h4>
                              <div className="space-y-1">
                                {booking.invitees.map((invitee: any, index: number) => (
                                  <div key={index} className="text-sm">
                                    {invitee.name} {invitee.email && `(${invitee.email})`}
                                    {invitee.numberOfPeople > 1 && ` - ${invitee.numberOfPeople} ${t('people') || 'people'}`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {booking.google_calendar_link && (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={booking.google_calendar_link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {t('viewInCalendar') || 'View in Calendar'}
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('profileSettings') || 'Profile Settings'}
                    </CardTitle>
                    <CardDescription>
                      {t('profileSettingsDesc') || 'Manage your account preferences'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Account Info */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">{t('email')}</Label>
                      <p className="text-sm">{profile?.email || user?.email}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">{t('fullName') || 'Name'}</Label>
                      <p className="text-sm">{profile?.full_name || '-'}</p>
                    </div>

                    {/* Preferred Language */}
                    <div className="space-y-2">
                      <Label htmlFor="preferredLanguage" className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="h-4 w-4 text-[#92F0B1]" />
                        {t('preferredLanguage') || 'Preferred Language'}
                      </Label>
                      <Select
                        value={profile?.preferred_language || 'nl'}
                        onValueChange={(value) => handleLanguageChange(value as 'nl' | 'en' | 'fr' | 'de')}
                        disabled={savingLanguage}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder={t('selectLanguage') || 'Select a language'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nl">Nederlands</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('languageEmailNote') || 'This will be the language in which you receive your emails. You can change this at any time.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Account created date */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {t('accountInfo') || 'Account Info'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">{t('memberSince') || 'Member since'}</Label>
                      <p className="text-sm">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '-'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={cartTotal}
      />
    </div>
  );
}
