'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function UnsubscribePage() {
  const t = useTranslations('unsubscribe');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    async function unsubscribe() {
      try {
        const response = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-[#92F0B1] animate-spin mb-4" />
              <h1 className="text-xl font-semibold text-[#0d1117]">
                {t('processing') || 'Processing...'}
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#0d1117] mb-2">
                {t('success') || 'Successfully Unsubscribed'}
              </h1>
              <p className="text-[#6b7280]">
                {t('successMessage') || 'You will no longer receive abandoned cart emails from us.'}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#0d1117] mb-2">
                {t('error') || 'Something went wrong'}
              </h1>
              <p className="text-[#6b7280]">
                {t('errorMessage') || 'We could not process your unsubscribe request. Please try again or contact support.'}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
