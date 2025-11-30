'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ShoppingCart, User, LogOut, Package, Trash2, Plus, Minus } from 'lucide-react';
import { getProducts } from '@/lib/api/content';
import type { Product } from '@/lib/data/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { ProductDetailDialog } from '@/components/webshop/product-detail-dialog';

export default function AccountPage() {
  const t = useTranslations('auth');
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { favorites, favoritesCount, removeFavorite } = useFavoritesContext();
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDialog(true);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const data = await getProducts();
        if (!isMounted) return;
        setProducts(data);
        setProductsError(null);
      } catch (error) {
        console.error('[AccountPage] Failed to load products', error);
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

  useEffect(() => {
    if (tabFromUrl === 'cart' || tabFromUrl === 'favorites') {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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
    favorites.some((fav) => fav.product_id === p.slug)
  );

  const cartProducts = cartItems.map((item) => {
    const product = products.find((p) => p.slug === item.product_id);
    return { ...item, product };
  });

  const cartTotal = cartProducts.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity;
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="h-4 w-4" />
                {t('myFavorites')}
              </TabsTrigger>
              <TabsTrigger value="cart" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t('myCart')}
                {cartItems.length > 0 && (
                  <span className="ml-1 rounded-full bg-[#92F0B1] px-2 py-0.5 text-xs text-[#0d1117]">
                    {cartCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites">
              {favoriteProducts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Heart className="mb-4 h-16 w-16 text-[#6b7280]" />
                    <h3 className="mb-2 text-xl font-semibold text-[#0d1117]">{t('noFavorites')}</h3>
                    <p className="mb-6 text-center text-[#6b7280]">{t('noFavoritesDesc')}</p>
                    <Button asChild className="bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]">
                      <Link href={`/${locale}/webshop`}>{t('browseProducts')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteProducts.map((product) => (
                    <Card key={product.slug} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleProductClick(product)}>
                      <CardHeader>
                        <CardTitle className="text-lg">{product.title[locale as 'nl' | 'en' | 'fr' | 'de']}</CardTitle>
                        <CardDescription>€{product.price.toFixed(2)}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await addToCart(product.slug, 1);
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
                            removeFavorite(product.slug);
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
            </TabsContent>

            <TabsContent value="cart">
              {cartProducts.length === 0 ? (
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
                    {cartProducts.map((item) => (
                      <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => item.product && handleProductClick(item.product)}>
                        <CardContent className="flex items-center justify-between p-6">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#0d1117]">
                              {item.product?.title[locale as 'nl' | 'en' | 'fr' | 'de']}
                            </h3>
                            <p className="text-[#6b7280]">€{item.product?.price.toFixed(2)}</p>
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
                              €{((item.product?.price || 0) * item.quantity).toFixed(2)}
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
                    ))}
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
                        <Button className="flex-1 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]">
                          {t('checkout')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          open={showProductDialog}
          onOpenChange={setShowProductDialog}
        />
      )}
    </div>
  );
}
