'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function LecturePaymentCancelledPage() {
  const t = useTranslations('lecturePaymentCancelled');
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-900">
              {t('helpMessage')}
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href={`/${locale}/lezing`}>{t('viewLecture')}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/${locale}/contact/contactformulier`}>{t('contactUs')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
