'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Loader2, Sparkles, Package, User, Mail, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import type { Tour, Locale } from '@/lib/data/types';

export default function OrderSuccessPage() {
  const t = useTranslations('orderSuccess');
  const params = useParams();
  const locale = params.locale as Locale;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [productMediaTypes, setProductMediaTypes] = useState<Record<string, 'image' | 'video'>>({});

  useEffect(() => {
    const fetchProductImages = async (orderData: any) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Get product IDs from order items first, then fallback to metadata
      let productIds = orderData?.items
        ?.map((item: any) => item.productId)
        .filter(Boolean);

      // Fallback: check order metadata for productIds array
      if ((!productIds || productIds.length === 0) && orderData?.metadata?.productIds) {
        productIds = orderData.metadata.productIds;
        console.log('Using productIds from order metadata:', productIds);
      }

      // If still no productIds, try to look up products by title
      if (!productIds || productIds.length === 0) {
        console.log('No product IDs found, trying to look up by title...');
        const itemTitles = orderData?.items
          ?.map((item: any) => item.title)
          .filter(Boolean);

        if (itemTitles && itemTitles.length > 0) {
          console.log('Looking up products by titles:', itemTitles);
          try {
            // Fetch all products and find matches by name
            const allProductsResponse = await fetch(
              `${supabaseUrl}/rest/v1/webshop_data?select=uuid,Name,product_images`,
              {
                headers: {
                  'apikey': supabaseAnonKey || '',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                },
              }
            );

            if (allProductsResponse.ok) {
              const allProducts = await allProductsResponse.json();
              // Find products that match item titles
              const matchedProducts = allProducts.filter((p: any) =>
                itemTitles.some((title: string) =>
                  p.Name?.toLowerCase() === title?.toLowerCase()
                )
              );
              console.log('Matched products by title:', matchedProducts);

              if (matchedProducts.length > 0) {
                const imageMap: Record<string, string> = {};
                const mediaTypeMap: Record<string, 'image' | 'video'> = {};

                matchedProducts.forEach((product: any) => {
                  const images = product.product_images;
                  if (images && Array.isArray(images) && images.length > 0) {
                    const sortedImages = [...images].sort((a: any, b: any) => {
                      if (a.is_primary === true && b.is_primary !== true) return -1;
                      if (a.is_primary !== true && b.is_primary === true) return 1;
                      return (a.sort_order || 0) - (b.sort_order || 0);
                    });
                    const primaryImage = sortedImages[0];
                    if (primaryImage && primaryImage.url) {
                      imageMap[product.uuid] = primaryImage.url;
                      mediaTypeMap[product.uuid] = primaryImage.media_type === 'video' ? 'video' : 'image';
                    }
                  }
                });

                console.log('Final product images map (by title):', imageMap);
                setProductImages(imageMap);
                setProductMediaTypes(mediaTypeMap);
                return;
              }
            }
          } catch (error) {
            console.error('Error looking up products by title:', error);
          }
        }

        console.log('No product IDs or titles found in order');
        return;
      }

      try {
        console.log('Fetching product images for IDs:', productIds);
        const queryUrl = `${supabaseUrl}/rest/v1/webshop_data?uuid=in.(${productIds.join(',')})&select=uuid,product_images`;
        console.log('Query URL:', queryUrl);

        // Fetch products with their images from webshop_data
        const response = await fetch(queryUrl, {
          headers: {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        });

        console.log('Product images fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch product images:', response.status, errorText);
          return;
        }

        const products = await response.json();
        console.log('Fetched products with images:', products);
        const imageMap: Record<string, string> = {};
        const mediaTypeMap: Record<string, 'image' | 'video'> = {};

        products.forEach((product: any) => {
          const images = product.product_images;
          console.log(`Product ${product.uuid} images:`, images);
          if (images && Array.isArray(images) && images.length > 0) {
            // Sort: is_primary=true first, then by sort_order
            const sortedImages = [...images].sort((a: any, b: any) => {
              if (a.is_primary === true && b.is_primary !== true) return -1;
              if (a.is_primary !== true && b.is_primary === true) return 1;
              return (a.sort_order || 0) - (b.sort_order || 0);
            });
            // Get the URL from the primary image
            const primaryImage = sortedImages[0];
            console.log(`Product ${product.uuid} selected primary:`, primaryImage);
            if (primaryImage && primaryImage.url) {
              imageMap[product.uuid] = primaryImage.url;
              mediaTypeMap[product.uuid] = primaryImage.media_type === 'video' ? 'video' : 'image';
              console.log(`Product ${product.uuid} set to:`, primaryImage.url, 'type:', primaryImage.media_type);
            }
          }
        });

        console.log('Final product images map:', imageMap);
        console.log('Final product media types map:', mediaTypeMap);
        setProductImages(imageMap);
        setProductMediaTypes(mediaTypeMap);
      } catch (error) {
        console.error('Error fetching product images:', error);
      }
    };

    const fetchOrder = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      // Retry logic - sometimes the order takes a moment to be created/updated by webhook
      let retries = 3;
      let delay = 1000;

      const attemptFetch = async (): Promise<void> => {
        try {
          console.log('Fetching order for session:', sessionId, `(attempt ${4 - retries}/3)`);

          // Use Supabase client which handles RLS properly
          const { data, error } = await supabase
            .from('stripe_orders')
            .select('*')
            .eq('checkout_session_id', sessionId)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

          if (error) {
            console.error('Error fetching order:', error);
            throw error;
          }

          if (data) {
            console.log('Order found:', data);
            console.log('Order items:', data.items);
            console.log('Order metadata:', data.metadata);
            console.log('Items with productId:', data.items?.filter((i: any) => i.productId));
            setOrder(data);
            // Fetch product images after order is loaded
            await fetchProductImages(data);
            setLoading(false);
            return;
          }

          // If no data and we have retries left, retry
          if (retries > 0) {
            retries--;
            console.log(`Order not found, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            return attemptFetch();
          }

          // No order found after all retries - try fetching from Stripe API as fallback
          console.warn('Order not found in database after retries, attempting to fetch from Stripe API...');
          try {
            const stripeResponse = await fetch(`/api/checkout-session/${sessionId}`);
            if (stripeResponse.ok) {
              const stripeData = await stripeResponse.json();
              console.log('Fetched order data from Stripe API:', stripeData);
              // Transform Stripe data to match order format
              const transformedItems = (stripeData.allLineItems || []).map((item: any) => ({
                title: item.name || 'Product',
                quantity: item.quantity || 1,
                price: item.unitPrice || item.totalPrice || 0, // Use unitPrice, fallback to totalPrice
                total: item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1),
                isShipping: item.isShipping || false,
              }));

              const fallbackOrder = {
                checkout_session_id: sessionId,
                payment_status: stripeData.paymentStatus || 'paid',
                status: 'completed',
                customer_email: stripeData.customerEmail,
                customer_name: stripeData.customerName,
                amount_total: stripeData.amountTotal ? stripeData.amountTotal * 100 : 0, // Convert to cents
                total_amount: stripeData.amountTotal || 0, // In euros
                items: transformedItems,
                metadata: {
                  promoCode: stripeData.promoCode,
                  promoDiscountPercent: stripeData.promoDiscountPercent,
                  product_subtotal: stripeData.productSubtotal || 0,
                  discount_amount: stripeData.discountAmount || 0,
                  shipping_cost: stripeData.shippingItems?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0,
                },
                // Mark as fallback so user knows it's from Stripe, not DB
                _isFallback: true,
              };
              setOrder(fallbackOrder);
              await fetchProductImages(fallbackOrder);
              setLoading(false);
              return;
            }
          } catch (stripeError) {
            console.error('Failed to fetch from Stripe API fallback:', stripeError);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error fetching order:', error);
          if (retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            return attemptFetch();
          }
          setLoading(false);
        }
      };

      attemptFetch();
    };

    const fetchFeaturedTours = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const toursRes = await fetch(`${supabaseUrl}/rest/v1/tours_table_prod?limit=3&select=*`, {
          headers: {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        });

        if (toursRes.ok) {
          const toursData = await toursRes.json();
          const mappedTours = toursData.map((row: any) => ({
            id: row.id,
            city: row.city?.toLowerCase() || '',
            slug: row.title.toLowerCase().replace(/\s+/g, '-'),
            title: row.title,
            type: row.type,
            durationMinutes: row.duration_minutes,
            price: row.price ? Number(row.price) : undefined,
            startLocation: row.start_location,
            endLocation: row.end_location,
            languages: row.languages || [],
            description: row.description,
            options: row.options,
          }));
          setFeaturedTours(mappedTours);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      }
    };

    fetchOrder();
    fetchFeaturedTours();
  }, [sessionId]);

  // Get a random product image for the hero section
  // Pick randomly from products that have images fetched
  const productIdsWithImages = Object.keys(productImages);
  const randomProductId = productIdsWithImages.length > 0
    ? productIdsWithImages[Math.floor(Math.random() * productIdsWithImages.length)]
    : null;
  const heroImage = randomProductId ? productImages[randomProductId] : null;
  const heroMediaType = randomProductId ? productMediaTypes[randomProductId] : 'image';

  console.log('=== ORDER SUCCESS RENDER DEBUG ===');
  console.log('productIdsWithImages:', productIdsWithImages);
  console.log('randomProductId:', randomProductId);
  console.log('heroImage:', heroImage);
  console.log('heroMediaType:', heroMediaType);
  console.log('productImages:', productImages);
  console.log('productMediaTypes:', productMediaTypes);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 text-center">
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>{t('notFoundTitle')}</h2>
            <p className="text-muted-foreground mb-2">{t('notFoundDescription')}</p>
            {sessionId && (
              <p className="text-xs font-mono text-muted-foreground mb-4">
                Session ID: {sessionId}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              {t('orderMayBeProcessing') || 'Your order may still be processing. Please check your email for confirmation or contact support if you have questions.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href={`/${locale}`}>{t('returnHome')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/account?tab=orders`}>{t('viewMyOrders') || 'View My Orders'}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Hero Section with Product Image */}
      <div className="relative w-full h-[280px] md:h-[360px]">
        <div className="absolute inset-0 overflow-hidden">
          {heroImage ? (
            <>
              {heroMediaType === 'video' ? (
                <video
                  src={heroImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={heroImage}
                  alt={order.items?.[0]?.title || 'Order'}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #1BDD95 0%, #17C683 50%, #14A86E 100%)' }}
            />
          )}
        </div>

        {/* Success badge at bottom edge of hero */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 translate-y-1/2 z-20">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(27, 221, 149, 0.9)', boxShadow: '0 0 30px rgba(27, 221, 149, 0.5)' }}
          >
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="bg-white rounded-xl px-8 py-6 shadow-lg">
            <h1
              className="text-3xl md:text-4xl font-bold text-center text-black"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('title')}
            </h1>
            <p className="mt-2 text-lg text-neutral-700 text-center max-w-md">
              {t('description')}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-32 md:mt-40 relative z-10 pb-16">
        {/* Main Content Card */}
        <Card
          className="max-w-2xl mx-auto overflow-hidden"
          style={{ boxShadow: 'var(--shadow-large)' }}
        >
          <CardContent className="p-0">
            {/* Order Header */}
            <div
              className="px-6 py-5"
              style={{ backgroundColor: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(27, 221, 149, 0.15)' }}
                  >
                    <ShoppingBag className="h-5 w-5" style={{ color: 'var(--primary-base)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('orderId')}</p>
                    <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {order.id ? String(order.id).slice(0, 8) : order.checkout_session_id?.slice(0, 8) || 'N/A'}
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(27, 221, 149, 0.15)', color: 'var(--primary-dark)' }}
                >
                  {order.status === 'completed' ? t('statusPaid') : t('statusProcessing')}
                </span>
              </div>
            </div>

            {/* Customer Info Grid */}
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('customerName')}</span>
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{order.customer_name}</p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('email')}</span>
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{order.customer_email}</p>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('shippingAddress')}</span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <p>{order.shipping_address.street}</p>
                    <p>{order.shipping_address.city}, {order.shipping_address.postalCode}</p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('orderItems')}</h3>
                </div>
                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => {
                    // Get image from fetched product images or fall back to item.image
                    const itemImage = (item.productId && productImages[item.productId]) || item.image;
                    const itemMediaType = (item.productId && productMediaTypes[item.productId]) || 'image';
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-light)' }}
                      >
                        {itemImage && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            {itemMediaType === 'video' ? (
                              <video
                                src={itemImage}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <Image
                                src={itemImage}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.title || item.name || 'Product'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {t('quantity')}: {item.quantity || 1}
                          </p>
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          €{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Summary */}
              {(() => {
                // Helper to check if item is shipping
                const isShippingItem = (item: any) => {
                  const title = item.title?.toLowerCase() || '';
                  return title.includes('verzendkosten') || title.includes('shipping') || title.includes('freight');
                };

                // Calculate product subtotal (use stored value or calculate from items excluding shipping)
                const productSubtotal = order.metadata?.product_subtotal ??
                  (order.items?.filter((item: any) => !isShippingItem(item))
                    .reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0) ?? 0);

                const discountAmount = order.metadata?.discount_amount ?? 0;
                const shippingCost = order.metadata?.shipping_cost ??
                  (order.items?.filter((item: any) => isShippingItem(item))
                    .reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0) ?? 0);

                return (
                  <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('subtotal')}</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        €{productSubtotal.toFixed(2)}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('discount') || 'Korting'}</span>
                        <span className="text-sm" style={{ color: 'var(--primary-base)' }}>
                          -€{discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('shippingCost')}</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        €{shippingCost.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center pt-3 mt-2 border-t"
                      style={{ borderColor: 'var(--border-light)' }}
                    >
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('total')}</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                        €{(() => {
                          if (order.total_amount != null) {
                            return order.total_amount.toFixed(2);
                          }
                          if (order.amount_total != null) {
                            return (order.amount_total / 100).toFixed(2);
                          }
                          return (productSubtotal - discountAmount + shippingCost).toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* What's next section */}
            <div className="px-6 pb-6">
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(27, 221, 149, 0.1)', border: '1px solid rgba(27, 221, 149, 0.2)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--primary-dark)' }}>{t('whatsNext')}</strong>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('nextSteps')}</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="px-6 py-5 flex gap-3"
              style={{ backgroundColor: 'var(--bg-light)', borderTop: '1px solid var(--border-light)' }}
            >
              <Button
                asChild
                className="flex-1"
                style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}
              >
                <Link href={`/${locale}`}>{t('returnHome')}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
                style={{ borderColor: 'var(--primary-base)', color: 'var(--primary-base)' }}
              >
                <Link href={`/${locale}/webshop`}>{t('continueShopping')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Featured Tours Section */}
        {featuredTours.length > 0 && (
          <div className="mt-16 max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--primary-base)' }} />
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                  Experience Belgium in Person
                </h2>
              </div>
              <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
                Love Belgian culture? Join one of our expertly guided tours
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {featuredTours.map((tour) => (
                <TourUpsellCard key={tour.id} tour={tour} locale={locale} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Button asChild size="lg" style={{ backgroundColor: 'var(--primary-base)' }}>
                <Link href={`/${locale}/tours`}>
                  View All Tours
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
