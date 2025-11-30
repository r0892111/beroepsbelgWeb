'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function CookieBanner() {
  const t = useTranslations('cookie');
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ functional: true, tracking: true }));
    setIsVisible(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ functional, tracking }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-4 shadow-lg">
      <div className="container mx-auto">
        {!showCustomize ? (
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">{t('message')}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustomize(true)}>
                {t('customize')}
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                {t('acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('message')}</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="functional" className="text-sm">
                {t('functional')}
              </Label>
              <Switch
                id="functional"
                checked={functional}
                onCheckedChange={setFunctional}
                disabled
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tracking" className="text-sm">
                {t('tracking')}
              </Label>
              <Switch id="tracking" checked={tracking} onCheckedChange={setTracking} />
            </div>
            <div className="flex justify-end gap-2">
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
