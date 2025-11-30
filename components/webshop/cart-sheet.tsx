'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { useCartContext } from '@/lib/contexts/cart-context';
import { CheckoutDialog } from './checkout-dialog';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function CartSheet() {
  const t = useTranslations('cart');
  const tAuth = useTranslations('auth');
  const { cartItems, cartCount, updateQuantity, removeFromCart, loading } = useCartContext();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + (item.products?.price || 0) * item.quantity;
  }, 0);

  const handleCheckout = () => {
    setSheetOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
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

          <div className="mt-8 flex flex-col h-full">
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
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 py-4 border-b">
                      {item.products?.image && (
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={item.products.image}
                            alt={item.products.title_nl || 'Product'}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {item.products?.title_nl || 'Product'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          €{item.products?.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
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
                      <div className="text-right">
                        <p className="font-medium">
                          €{((item.products?.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('total')}:</span>
                    <span>€{totalAmount.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                  >
                    {t('proceedToCheckout')}
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
