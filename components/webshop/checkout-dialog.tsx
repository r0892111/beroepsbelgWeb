'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Gift, Truck, X, CheckCircle2, XCircle } from 'lucide-react';
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
  
  // Gift card redemption state
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    code: string;
    currentBalance: number;
    amountApplied: number;
  } | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);

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

  // Calculate gift card discount
  const giftCardDiscount = appliedGiftCard ? Math.min(appliedGiftCard.amountApplied, totalAmount + shippingCost) : 0;
  
  // Total including shipping and gift card discount
  const grandTotal = Math.max(0, totalAmount + shippingCost - giftCardDiscount);

  // Handle gift card application
  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    
    setGiftCardLoading(true);
    setGiftCardError(null);
    
    try {
      const response = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode.trim().toUpperCase() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setGiftCardError(data.error || 'Invalid gift card code');
        return;
      }
      
      const orderTotal = totalAmount + shippingCost;
      const amountToApply = Math.min(data.giftCard.currentBalance, orderTotal);
      
      setAppliedGiftCard({
        code: data.giftCard.code,
        currentBalance: data.giftCard.currentBalance,
        amountApplied: amountToApply,
      });
      setGiftCardCode('');
    } catch (err) {
      setGiftCardError('Failed to validate gift card');
    } finally {
      setGiftCardLoading(false);
    }
  };

  const handleRemoveGiftCard = () => {
    setAppliedGiftCard(null);
    setGiftCardError(null);
  };

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
          giftCardCode: appliedGiftCard?.code || null, // Include gift card code for redemption
          giftCardDiscount: appliedGiftCard ? giftCardDiscount : 0, // Include discount amount to apply in Stripe
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

          {/* Gift Card Redemption */}
          {!isGiftCardOnly && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {t('haveGiftCard') || 'Have a gift card?'}
              </Label>
              
              {appliedGiftCard ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {t('giftCardApplied') || 'Gift Card Applied'}
                      </p>
                      <p className="text-xs text-green-700 font-mono">{appliedGiftCard.code}</p>
                      <p className="text-xs text-green-700">
                        -€{appliedGiftCard.amountApplied.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveGiftCard}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={giftCardCode}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
                      if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
                      if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14);
                      if (value.length > 19) value = value.slice(0, 19);
                      setGiftCardCode(value);
                    }}
                    maxLength={19}
                    className="font-mono flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && giftCardCode.trim()) {
                        e.preventDefault();
                        void handleApplyGiftCard();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyGiftCard}
                    disabled={giftCardLoading || !giftCardCode.trim()}
                  >
                    {giftCardLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('apply') || 'Apply'
                    )}
                  </Button>
                </div>
              )}
              
              {giftCardError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {giftCardError}
                </p>
              )}
            </div>
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
              {appliedGiftCard && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    {t('giftCardDiscount') || 'Gift Card Discount'}
                  </span>
                  <span>-€{giftCardDiscount.toFixed(2)}</span>
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
