'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Gift, Truck } from 'lucide-react';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTranslations } from 'next-intl';

// Shipping cost constants (must match create-webshop-checkout)
const SHIPPING_COST_BELGIUM = 7.50;
const SHIPPING_COST_INTERNATIONAL = 14.99;
const FREE_SHIPPING_THRESHOLD = 150;

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number; // Product subtotal (without shipping)
}

export function CheckoutDialog({ open, onOpenChange, totalAmount }: CheckoutDialogProps) {
  const t = useTranslations('checkout');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuth();
  const { cartItems, clearCart } = useCartContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'België',
  });

  // Check if cart contains only gift cards (no physical products)
  const isGiftCardOnly = useMemo(() => {
    if (cartItems.length === 0) return false;
    return cartItems.every(item => {
      const product = item.products as any;
      // Check if product is a gift card by category or is_giftcard flag
      return product?.category === 'GiftCard' || product?.is_giftcard === true;
    });
  }, [cartItems]);

  // Calculate shipping cost based on country and order total
  const shippingCost = useMemo(() => {
    // No shipping for gift card only orders
    if (isGiftCardOnly) return 0;
    // Free shipping for orders >= €150
    if (totalAmount >= FREE_SHIPPING_THRESHOLD) return 0;
    // Belgium vs International
    const isBelgium = formData.country === 'België' || formData.country === 'Belgium';
    return isBelgium ? SHIPPING_COST_BELGIUM : SHIPPING_COST_INTERNATIONAL;
  }, [isGiftCardOnly, totalAmount, formData.country]);

  // Total including shipping
  const grandTotal = totalAmount + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Get gift card amounts from sessionStorage
      const giftCardAmounts = JSON.parse(sessionStorage.getItem('giftCardAmounts') || '{}');

      const items = cartItems.map(item => {
        const product = item.products as any;
        const isGiftCard = product?.category === 'GiftCard' || product?.is_giftcard === true;
        
        return {
          productId: item.product_id,
          quantity: item.quantity,
          // Include custom price for gift cards
          customPrice: isGiftCard ? giftCardAmounts[item.product_id] : undefined,
          isGiftCard,
        };
      });

      // For gift card only orders, use a dummy shipping address
      const shippingAddress = isGiftCardOnly 
        ? { street: 'Digital Delivery', city: 'N/A', postalCode: '0000', country: 'België' }
        : {
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
          };

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-webshop-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          items,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          shippingAddress,
          billingAddress: shippingAddress,
          userId: user?.id || null,
          locale: locale || 'nl',
          isGiftCardOnly,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No checkout URL received');
      }

      await clearCart();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('enterDetails') || 'Vul je gegevens in om je bestelling af te ronden.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fullName')} {t('required')}</Label>
            <Input
              id="name"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} {t('required')}</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')} {t('required')}</Label>
            <Input
              id="phone"
              type="tel"
              required
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="+32 XXX XX XX XX"
            />
          </div>

          {/* Gift card notice - no shipping needed */}
          {isGiftCardOnly && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{t('digitalDelivery') || 'Digital Delivery'}</p>
                <p className="text-sm text-green-700">{t('giftCardNoShipping') || 'Gift cards are delivered via email - no shipping address needed!'}</p>
              </div>
            </div>
          )}

          {/* Only show shipping fields if not gift card only */}
          {!isGiftCardOnly && (
            <>
              <div className="space-y-2">
                <Label htmlFor="street">{t('streetAddress')} {t('required')}</Label>
                <Input
                  id="street"
                  required
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('city')} {t('required')}</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t('postalCode')} {t('required')}</Label>
                  <Input
                    id="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('country')} {t('required')}</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value: string) => setFormData({ ...formData, country: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een land" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="België">België</SelectItem>
                    <SelectItem value="Nederland">Nederland</SelectItem>
                    <SelectItem value="Frankrijk">Frankrijk</SelectItem>
                    <SelectItem value="Duitsland">Duitsland</SelectItem>
                    <SelectItem value="Luxemburg">Luxemburg</SelectItem>
                    <SelectItem value="Verenigd Koninkrijk">Verenigd Koninkrijk</SelectItem>
                    <SelectItem value="Spanje">Spanje</SelectItem>
                    <SelectItem value="Italië">Italië</SelectItem>
                    <SelectItem value="Portugal">Portugal</SelectItem>
                    <SelectItem value="Oostenrijk">Oostenrijk</SelectItem>
                    <SelectItem value="Zwitserland">Zwitserland</SelectItem>
                    <SelectItem value="Anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-col gap-4">
            {/* Price breakdown */}
            <div className="w-full space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal') || 'Subtotaal'}</span>
                <span>€{totalAmount.toFixed(2)}</span>
              </div>
              {!isGiftCardOnly && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {t('shipping') || 'Verzendkosten'}
                    {shippingCost === 0 && totalAmount >= FREE_SHIPPING_THRESHOLD && (
                      <span className="text-green-600 text-xs">({t('freeShipping') || 'Gratis'})</span>
                    )}
                  </span>
                  <span className={shippingCost === 0 ? 'text-green-600' : ''}>
                    {shippingCost === 0 ? t('free') || 'Gratis' : `€${shippingCost.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t('total')}</span>
                <span>€{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('proceedToPayment')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
