'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

// Global event for re-opening the cookie banner
const COOKIE_BANNER_OPEN_EVENT = 'openCookieBanner';

// Helper to dispatch open event (can be called from anywhere)
export function openCookieBanner() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COOKIE_BANNER_OPEN_EVENT));
  }
}

// Helper to get current cookie consent
export function getCookieConsent(): { essential: boolean; payment: boolean } | null {
  if (typeof window === 'undefined') return null;
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) return null;
  try {
    return JSON.parse(consent);
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const t = useTranslations('cookie');
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  // Essential cookies are always required (auth, locale)
  // Payment cookies (Stripe) are also essential for the service
  const [payment, setPayment] = useState(true);

  const openBanner = useCallback(() => {
    // Load current preferences when opening
    const consent = getCookieConsent();
    if (consent) {
      setPayment(consent.payment);
    }
    setIsVisible(true);
    setShowCustomize(false);
  }, []);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setIsVisible(true);
    }

    // Listen for open event (from footer "Cookie Settings" link)
    window.addEventListener(COOKIE_BANNER_OPEN_EVENT, openBanner);
    return () => {
      window.removeEventListener(COOKIE_BANNER_OPEN_EVENT, openBanner);
    };
  }, [openBanner]);

  const saveConsent = (preferences: { essential: boolean; payment: boolean }) => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      ...preferences,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
    setShowCustomize(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, payment: true });
  };

  const handleRejectNonEssential = () => {
    // Essential cookies are always on, payment is essential for e-commerce
    saveConsent({ essential: true, payment: true });
  };

  const handleSaveSettings = () => {
    saveConsent({ essential: true, payment });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-4 shadow-lg">
      <div className="container mx-auto max-w-4xl">
        {!showCustomize ? (
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {t('message')}{' '}
                <Link href="/privacy" className="underline hover:text-foreground">
                  {t('learnMore')}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustomize(true)}>
                <Settings className="mr-1 h-3 w-3" />
                {t('customize')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectNonEssential}>
                {t('essentialOnly')}
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                {t('acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('customizeMessage')}{' '}
                <Link href="/privacy" className="underline hover:text-foreground">
                  {t('learnMore')}
                </Link>
              </p>
            </div>

            {/* Essential Cookies - Always On */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="essential" className="text-sm font-medium">
                    {t('essential')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('essentialDesc')}
                  </p>
                </div>
                <Switch
                  id="essential"
                  checked={true}
                  disabled
                  aria-label={t('essential')}
                />
              </div>
            </div>

            {/* Payment Cookies */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="payment" className="text-sm font-medium">
                    {t('payment')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('paymentDesc')}
                  </p>
                </div>
                <Switch
                  id="payment"
                  checked={payment}
                  onCheckedChange={setPayment}
                  aria-label={t('payment')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustomize(false)}>
                {t('back')}
              </Button>
              <Button size="sm" onClick={handleSaveSettings}>
                {t('save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
