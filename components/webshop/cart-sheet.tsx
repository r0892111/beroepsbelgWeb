'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, ArrowRight, Gift } from 'lucide-react';
import { useCartContext } from '@/lib/contexts/cart-context';
import { CheckoutDialog } from './checkout-dialog';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { getProductPlaceholder } from '@/lib/utils/placeholder-images';
import type { Locale } from '@/i18n';

export function CartSheet() {
  const t = useTranslations('cart');
  const tAuth = useTranslations('auth');
  const params = useParams();
  const locale = (params?.locale as Locale) || 'nl';
  const { cartItems, cartCount, updateQuantity, removeFromCart, loading, refetch } = useCartContext();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [giftCardAmounts, setGiftCardAmounts] = useState<Record<string, number>>({});

  // Load gift card amounts from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('giftCardAmounts');
      if (stored) {
        setGiftCardAmounts(JSON.parse(stored));
      }
    }
  }, [sheetOpen]);

  // Helper to check if a product is a gift card (based on category or is_giftcard flag)
  const isGiftCard = (product: any) => {
    return product?.category === 'GiftCard' || product?.is_giftcard === true;
  };

  // Helper to get the price for an item (custom for gift cards)
  const getItemPrice = (item: any) => {
    const product = item.products;
    if (isGiftCard(product)) {
      return giftCardAmounts[item.product_id] || 0;
    }
    return product?.price || 0;
  };

  // Refetch cart when sheet opens
  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (open) {
      // Refetch cart data when opening
      void refetch();
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + getItemPrice(item) * item.quantity;
  }, 0);

  const handleCheckout = () => {
    setSheetOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                suppressHydrationWarning
              >
                {cartCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('title')}</SheetTitle>
            <SheetDescription>
              {t('itemCount', { count: cartCount })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 flex flex-col" style={{ height: 'calc(100% - 4rem)' }}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">{t('loading')}</p>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">{t('empty')}</p>
                <Button variant="outline" onClick={() => setSheetOpen(false)}>
                  {tAuth('continueShopping')}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  {cartItems.map((item) => {
                    const product = item.products;
                    const itemIsGiftCard = isGiftCard(product);
                    const itemPrice = getItemPrice(item);
                    return (
                      <div key={item.id} className="flex gap-4 py-4 border-b">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            {itemIsGiftCard ? (
                              <div className="w-full h-full bg-gradient-to-br from-[var(--primary-base)] to-[var(--primary-dark)] rounded flex items-center justify-center">
                                <Gift className="h-8 w-8 text-white" />
                              </div>
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
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">
                            {itemIsGiftCard 
                              ? `Cadeaubon €${itemPrice.toFixed(2)}`
                              : ((product as any)?.Name || (product as any)?.title_nl || (product as any)?.title_en || (product as any)?.title_fr || (product as any)?.title_de || 'Product')
                            }
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            €{itemPrice.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {!itemIsGiftCard && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, Math.max(0, item.quantity - 1))}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-auto"
                              onClick={() => removeFromCart(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-medium text-sm">
                            €{(itemPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4 space-y-4 bg-background sticky bottom-0">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('total')}:</span>
                    <span>€{totalAmount.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full btn-primary"
                    size="lg"
                    onClick={handleCheckout}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {t('proceedToCheckout') || 'Go to Payment'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={totalAmount}
      />
    </>
  );
}
