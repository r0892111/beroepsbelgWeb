'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTranslations } from 'next-intl';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
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
    street: '',
    city: '',
    postalCode: '',
    country: 'België',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      const items = cartItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
      }));

      const shippingAddress = {
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
          shippingAddress,
          billingAddress: shippingAddress,
          userId: user?.id || null,
          locale: locale || 'nl',
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
            {t('completePurchase', { total: totalAmount.toFixed(2) })}
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

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="text-lg font-bold">
                {t('total')}: €{totalAmount.toFixed(2)}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('proceedToPayment')
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
