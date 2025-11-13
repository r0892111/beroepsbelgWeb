'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAdmin } from '@/lib/contexts/admin-context';
import { useTranslations } from 'next-intl';

type StatusState = 'loading' | 'success' | 'error';

export default function TeamleaderCallbackPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshTeamleaderIntegration } = useAdmin();

  const [status, setStatus] = useState<StatusState>('loading');
  const [message, setMessage] = useState<string>(t('teamleaderConnecting'));
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const code = searchParams.get('code');

    if (errorParam) {
      setStatus('error');
      setMessage(t('teamleaderError'));
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage(t('teamleaderMissingCode'));
      return;
    }

    const exchangeCode = async () => {
      setStatus('loading');
      setMessage(t('teamleaderConnecting'));

      const redirectUri = `${window.location.origin}/admin/teamleader/callback`;
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        session_url: string;
      }>('teamleader-auth', {
        body: {
          code,
          redirect_uri: redirectUri
        }
      });

      if (error || !data?.success || !data.session_url) {
        setStatus('error');
        setMessage(t('teamleaderError'));
        return;
      }

      localStorage.setItem('teamleaderSessionUrl', data.session_url);
      setSessionUrl(data.session_url);
      setStatus('success');
      setMessage(t('teamleaderSuccess'));
      await refreshTeamleaderIntegration();

      setTimeout(() => {
        router.replace('/admin/dashboard?teamleader=connected');
      }, 2000);
    };

    void exchangeCode();
  }, [searchParams, t, router, refreshTeamleaderIntegration]);

  const handleGoBack = () => {
    router.replace('/admin/dashboard');
  };

  const handleOpenSession = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-navy">{t('integrations')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-navy" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="text-sm text-muted-foreground">{message}</p>
              {sessionUrl && (
                <Button onClick={handleOpenSession}>
                  {t('teamleaderOpenSession')}
                </Button>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoBack}>
                  {t('teamleaderBackToDashboard')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

