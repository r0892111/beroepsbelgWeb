'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Home } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTranslations } from 'next-intl';

type StatusState = 'loading' | 'success' | 'error';

export default function TeamleaderCallbackPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const [status, setStatus] = useState<StatusState>('loading');
  const [message, setMessage] = useState<string>(t('teamleaderConnecting') || 'Connecting to Teamleader...');
  const exchangeTriggeredRef = useRef(false);
  const hasSucceededRef = useRef(false);

  useEffect(() => {
    // Check admin access
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push('/nl');
      return;
    }
  }, [user, profile, router]);

  useEffect(() => {
    // Skip if we've already processed the exchange or succeeded
    if (exchangeTriggeredRef.current || hasSucceededRef.current) {
      return;
    }

    // Don't proceed if user is not admin
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      return;
    }

    const errorParam = searchParams.get('error');
    const code = searchParams.get('code');
    const providedState = searchParams.get('state');
    const storedState = localStorage.getItem('teamleaderOauthState');

    console.log('Teamleader callback params:', { errorParam, hasCode: !!code, providedState, storedState });

    if (errorParam) {
      hasSucceededRef.current = true;
      setStatus('error');
      setMessage(t('teamleaderError') || 'An error occurred during Teamleader integration.');
      return;
    }

    if (!code) {
      hasSucceededRef.current = true;
      setStatus('error');
      setMessage(t('teamleaderMissingCode') || 'Authorization code missing from Teamleader callback.');
      return;
    }

    if (!storedState || !providedState) {
      console.error('State validation failed - missing state:', { storedState, providedState });
      hasSucceededRef.current = true;
      setStatus('error');
      setMessage(t('teamleaderInvalidState') || 'Security validation failed. Please restart the Teamleader connection.');
      return;
    }

    if (storedState !== providedState) {
      console.error('State validation failed - mismatch:', { storedState, providedState });
      hasSucceededRef.current = true;
      setStatus('error');
      setMessage(t('teamleaderInvalidState') || 'Security validation failed. Please restart the Teamleader connection.');
      return;
    }

    const exchangeCode = async () => {
      if (exchangeTriggeredRef.current || !user?.id) {
        return;
      }
      exchangeTriggeredRef.current = true;
      setStatus('loading');
      setMessage(t('teamleaderConnecting') || 'Connecting to Teamleader...');

      const redirectUri = `${window.location.origin}/admin/teamleader/callback`;
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        teamleader_user_id?: string;
        error?: string;
      }>('teamleader-auth', {
        body: {
          code,
          redirect_uri: redirectUri,
          user_id: user.id
        }
      });

      console.log('Teamleader callback response:', { data, error });

      // Check for Supabase function invoke errors
      if (error) {
        console.error('Supabase function invoke error:', error);
        hasSucceededRef.current = true;
        setStatus('error');
        setMessage(error.message || t('teamleaderError') || 'An error occurred during Teamleader integration.');
        return;
      }

      // Check if data exists and has success flag
      if (!data) {
        console.error('No data in response');
        hasSucceededRef.current = true;
        setStatus('error');
        setMessage(t('teamleaderError') || 'An error occurred during Teamleader integration.');
        return;
      }

      // Check for explicit error in response
      if (data.error) {
        console.error('Function returned error:', data.error);
        hasSucceededRef.current = true;
        setStatus('error');
        setMessage(data.error);
        return;
      }

      // If we got here with data and no error, treat as success
      if (data.success === false) {
        console.error('Function explicitly returned failure:', data);
        hasSucceededRef.current = true;
        setStatus('error');
        setMessage(t('teamleaderError') || 'An error occurred during Teamleader integration.');
        return;
      }

      localStorage.removeItem('teamleaderOauthState');
      hasSucceededRef.current = true;
      
      const successMessage = t('teamleaderSuccess') || 'Successfully connected to Teamleader!';
      console.log('Teamleader auth succeeded, showing success message:', successMessage);
      
      setStatus('success');
      setMessage(successMessage);

      // Show success message for 3 seconds before redirecting
      setTimeout(() => {
        router.replace('/nl/admin/dashboard?teamleader=connected');
      }, 3000);
    };

    void exchangeCode();
  }, [searchParams, router, user, profile, t]);

  const handleGoBack = () => {
    router.replace('/nl/admin/dashboard');
  };

  // Don't render if user is not admin
  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Link href="/nl">
          <Button variant="ghost" size="sm">
            <Home className="h-4 w-4 mr-2" />
            {t('home') || 'Home'}
          </Button>
        </Link>
      </div>
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
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-base font-medium text-green-700">{message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('teamleaderRedirecting') || 'Redirecting to dashboard...'}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoBack}>
                  {t('teamleaderBackToDashboard') || 'Back to Dashboard'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

