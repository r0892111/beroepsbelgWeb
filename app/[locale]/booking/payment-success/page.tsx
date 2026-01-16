'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export default function PaymentSuccessPage() {
  const t = useTranslations('bookingSuccess');

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('title') || 'Betaling geslaagd!'}</CardTitle>
          <CardDescription>
            {t('description') || 'Bedankt voor je betaling. Je ontvangt binnenkort een bevestigingsmail.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{t('whatsNext') || 'Wat nu?'}</strong>
              <br />
              {t('nextSteps') || 'Je ontvangt een bevestigingsmail met alle details van je boeking. Als je vragen hebt, neem dan contact met ons op.'}
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/">{t('returnHome') || 'Terug naar home'}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/tours">{t('browseTours') || 'Bekijk tours'}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
