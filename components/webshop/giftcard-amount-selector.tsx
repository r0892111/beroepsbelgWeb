'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Gift, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface GiftCardAmountSelectorProps {
  productUuid: string;
  onAmountSelected?: (amount: number) => void;
}

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

export function GiftCardAmountSelector({ productUuid, onAmountSelected }: GiftCardAmountSelectorProps) {
  const t = useTranslations('giftcard');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuth();
  const { addToCart } = useCartContext();
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
    onAmountSelected?.(amount);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setIsCustom(true);
    setSelectedAmount(null);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      onAmountSelected?.(parsed);
    }
  };

  const getFinalAmount = (): number => {
    if (isCustom && customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount || 0;
  };

  const handleAddToCart = async () => {
    if (!user) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    const amount = getFinalAmount();
    if (amount < 10) {
      toast.error(t('minimumAmount') || 'Minimum amount is €10');
      return;
    }

    setIsAdding(true);
    try {
      // Store the custom amount in localStorage for the checkout
      // The cart will use this amount when processing the gift card
      const giftCardData = {
        productUuid,
        amount,
        addedAt: new Date().toISOString(),
      };
      
      // Store gift card amount in sessionStorage (per-session, cleared on close)
      const existingGiftCards = JSON.parse(sessionStorage.getItem('giftCardAmounts') || '{}');
      existingGiftCards[productUuid] = amount;
      sessionStorage.setItem('giftCardAmounts', JSON.stringify(existingGiftCards));
      
      await addToCart(productUuid, 1);
      toast.success(t('addedToCart') || 'Gift card added to cart!');
    } catch (error) {
      toast.error(t('failedToAdd') || 'Failed to add gift card');
    } finally {
      setIsAdding(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <div className="space-y-6">
      {/* Preset amounts */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          {t('selectAmount') || 'Select Amount'}
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {PRESET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={selectedAmount === amount && !isCustom ? 'default' : 'outline'}
              className={`h-14 text-lg font-bold transition-all ${
                selectedAmount === amount && !isCustom
                  ? 'bg-[var(--primary-base)] text-white border-[var(--primary-base)]'
                  : 'hover:border-[var(--primary-base)] hover:text-[var(--primary-base)]'
              }`}
              onClick={() => handlePresetSelect(amount)}
            >
              €{amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <Label htmlFor="custom-amount" className="text-base font-semibold mb-2 block">
          {t('orCustomAmount') || 'Or enter custom amount'}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-500">€</span>
          <Input
            id="custom-amount"
            type="number"
            min="10"
            step="0.01"
            placeholder="10.00"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            className={`pl-8 h-14 text-lg ${isCustom ? 'border-[var(--primary-base)] ring-1 ring-[var(--primary-base)]' : ''}`}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {t('minimumAmountNote') || 'Minimum €10'}
        </p>
      </div>

      {/* Selected amount display */}
      {finalAmount > 0 && (
        <div className="bg-[var(--primary-lighter)] p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[var(--primary-base)]" />
              <span className="font-semibold">{t('giftCardValue') || 'Gift Card Value'}</span>
            </div>
            <span className="text-2xl font-bold text-[var(--primary-base)]">
              €{finalAmount.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {t('noShipping') || 'Digital delivery - no shipping costs'}
          </p>
        </div>
      )}

      {/* Add to cart button */}
      <Button
        onClick={handleAddToCart}
        disabled={isAdding || finalAmount < 10}
        className="w-full h-14 text-lg gap-2"
        style={{
          backgroundColor: 'var(--primary-base)',
          color: 'white',
        }}
      >
        <ShoppingCart className="h-5 w-5" />
        {isAdding 
          ? (t('adding') || 'Adding...') 
          : (t('addToCartButton') || `Add €${finalAmount.toFixed(2)} Gift Card to Cart`)
        }
      </Button>
    </div>
  );
}
