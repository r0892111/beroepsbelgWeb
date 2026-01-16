'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Gift, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface GiftCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productUuid: string;
}

const PRESET_AMOUNTS = [25, 50, 100, 200];

export function GiftCardDialog({ open, onOpenChange, productUuid }: GiftCardDialogProps) {
  const t = useTranslations('giftcard');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuth();
  const { addToCart } = useCartContext();
  
  const [selectedPreset, setSelectedPreset] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [isCustom, setIsCustom] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handlePresetSelect = (amount: number) => {
    setSelectedPreset(amount);
    setIsCustom(false);
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    setSelectedPreset(null);
  };

  const getFinalAmount = (): number => {
    if (isCustom) {
      return customAmount;
    }
    return selectedPreset || 50;
  };

  const handleAddToCart = async () => {
    if (!user) {
      onOpenChange(false);
      router.push(`/${locale}/auth/sign-in`);
      return;
    }

    const amount = getFinalAmount();
    if (amount < 25) {
      toast.error(t('minimumAmount') || 'Minimum amount is €25');
      return;
    }

    setIsAdding(true);
    try {
      // Store gift card amount in sessionStorage
      const existingGiftCards = JSON.parse(sessionStorage.getItem('giftCardAmounts') || '{}');
      existingGiftCards[productUuid] = amount;
      sessionStorage.setItem('giftCardAmounts', JSON.stringify(existingGiftCards));
      
      await addToCart(productUuid, 1);
      toast.success(t('addedToCart') || 'Gift card added to cart!');
      onOpenChange(false);
    } catch (error) {
      toast.error(t('failedToAdd') || 'Failed to add gift card');
    } finally {
      setIsAdding(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-6 w-6 text-[var(--primary-base)]" />
            {t('title') || 'Gift Card'}
          </DialogTitle>
          <DialogDescription>
            {t('selectAmountDescription') || 'Choose the value for your gift card'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset amounts */}
          <div className="grid grid-cols-2 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedPreset === amount && !isCustom ? 'default' : 'outline'}
                className={`h-14 text-lg font-bold transition-all ${
                  selectedPreset === amount && !isCustom
                    ? 'bg-[var(--primary-base)] text-white border-[var(--primary-base)] hover:bg-[var(--primary-dark)]'
                    : 'hover:border-[var(--primary-base)] hover:text-[var(--primary-base)]'
                }`}
                onClick={() => handlePresetSelect(amount)}
              >
                €{amount}
              </Button>
            ))}
          </div>

          {/* Custom option */}
          <div>
            <Button
              variant={isCustom ? 'default' : 'outline'}
              className={`w-full h-12 font-semibold transition-all ${
                isCustom
                  ? 'bg-[var(--primary-base)] text-white border-[var(--primary-base)] hover:bg-[var(--primary-dark)]'
                  : 'hover:border-[var(--primary-base)] hover:text-[var(--primary-base)]'
              }`}
              onClick={handleCustomSelect}
            >
              {t('customAmount') || 'Custom Amount'}
            </Button>

            {/* Slider for custom amount */}
            {isCustom && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">€25</span>
                  <span className="text-2xl font-bold text-[var(--primary-base)]">
                    €{customAmount}
                  </span>
                  <span className="text-sm text-gray-600">€10,000</span>
                </div>
                <Slider
                  value={[customAmount]}
                  onValueChange={(value) => setCustomAmount(value[0])}
                  min={25}
                  max={10000}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-center text-gray-500">
                  {t('dragToSelect') || 'Drag to select your amount'}
                </p>
              </div>
            )}
          </div>

          {/* Selected amount display */}
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

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full h-14 text-lg gap-2"
            style={{
              backgroundColor: 'var(--primary-base)',
              color: 'white',
            }}
          >
            <ShoppingCart className="h-5 w-5" />
            {isAdding 
              ? (t('adding') || 'Adding...') 
              : (t('addToCartWithAmount') || `Add €${finalAmount} Gift Card`)
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
