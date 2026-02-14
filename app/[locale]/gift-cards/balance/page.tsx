'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Gift, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GiftCardBalancePage() {
  const t = useTranslations('giftcard');
  const params = useParams();
  const locale = params.locale as string;

  const [code, setCode] = useState('');
  const [balance, setBalance] = useState<{
    code: string;
    currentBalance: number;
    initialAmount: number;
    currency: string;
    status: string;
    expiresAt: string | null;
    lastUsed: string | null;
    purchasedAt: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setError('');
    setBalance(null);

    try {
      const response = await fetch('/api/gift-cards/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('failedToCheckBalance') || 'Failed to check balance');
        return;
      }

      setBalance(data);
    } catch (err) {
      setError(t('failedToCheckBalanceError') || 'Failed to check balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t('checkBalance') || 'Check Gift Card Balance'}
          </CardTitle>
          <CardDescription>
            {t('checkBalanceDescription') || 'Enter your gift card code to check the current balance'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="giftCardCode">
              {t('giftCardCode') || 'Gift Card Code'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="giftCardCode"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => {
                  // Auto-format as user types
                  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  // Add dashes every 4 characters
                  if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
                  if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
                  if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14);
                  if (value.length > 19) value = value.slice(0, 19);
                  setCode(value);
                }}
                maxLength={19}
                className="font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.trim()) {
                    e.preventDefault();
                    void handleCheck();
                  }
                }}
              />
              <Button
                onClick={handleCheck}
                disabled={loading || !code.trim()}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('checking') || 'Checking...'}
                  </>
                ) : (
                  t('check') || 'Check'
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {balance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-3">
                    {t('giftCardDetails') || 'Gift Card Details'}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('code') || 'Code'}:</span>
                      <span className="font-mono font-semibold">{balance.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('currentBalance') || 'Current Balance'}:</span>
                      <span className="font-semibold text-green-700">
                        €{balance.currentBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('originalAmount') || 'Original Amount'}:</span>
                      <span>€{balance.initialAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('status') || 'Status'}:</span>
                      <span className="capitalize">{t(balance.status) || balance.status}</span>
                    </div>
                    {balance.lastUsed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('lastUsed') || 'Last Used'}:</span>
                        <span>{new Date(balance.lastUsed).toLocaleDateString()}</span>
                      </div>
                    )}
                    {balance.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('expiresAt') || 'Expires'}:</span>
                        <span>{new Date(balance.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {balance.currentBalance > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <Link href={`/${locale}/webshop`}>
                        <Button className="w-full btn-primary">
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          {t('startShopping') || 'Start Shopping'}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
