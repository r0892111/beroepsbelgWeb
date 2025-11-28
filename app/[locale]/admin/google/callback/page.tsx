'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Google connection...');

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) {
        setStatus('error');
        setMessage('You must be logged in to connect Google.');
        setTimeout(() => {
          router.push('/nl/auth/sign-in');
        }, 2000);
        return;
      }

      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');
      const error = searchParams.get('error');
      const storedState = localStorage.getItem('googleOauthState');

      if (error) {
        setStatus('error');
        setMessage(`Google authorization failed: ${error}`);
        localStorage.removeItem('googleOauthState');
        setTimeout(() => {
          router.push('/nl/admin/dashboard');
        }, 3000);
        return;
      }

      if (!code || !returnedState) {
        setStatus('error');
        setMessage('Missing authorization code or state.');
        localStorage.removeItem('googleOauthState');
        setTimeout(() => {
          router.push('/nl/admin/dashboard');
        }, 3000);
        return;
      }

      if (returnedState !== storedState) {
        setStatus('error');
        setMessage('Invalid state parameter. Possible CSRF attack.');
        localStorage.removeItem('googleOauthState');
        setTimeout(() => {
          router.push('/nl/admin/dashboard');
        }, 3000);
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          throw new Error('No valid session');
        }

        const { data, error: exchangeError } = await supabase.functions.invoke<{
          success: boolean;
          user_info?: Record<string, unknown>;
          error?: string;
        }>('google-oauth', {
          body: {
            action: 'exchange',
            code,
            redirect_uri: `${window.location.origin}/nl/admin/google/callback`,
            state: returnedState,
          },
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (exchangeError || !data?.success) {
          throw new Error(data?.error || exchangeError?.message || 'Failed to exchange code');
        }

        localStorage.removeItem('googleOauthState');
        setStatus('success');
        setMessage('Google account connected successfully!');

        setTimeout(() => {
          router.push('/nl/admin/dashboard?google=connected');
        }, 2000);
      } catch (err) {
        console.error('Google callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to connect Google account');
        localStorage.removeItem('googleOauthState');
        setTimeout(() => {
          router.push('/nl/admin/dashboard');
        }, 3000);
      }
    };

    void handleCallback();
  }, [user, searchParams, router]);

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-navy flex items-center gap-2">
            {status === 'processing' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
            Google Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-muted-foreground">{message}</p>
          {status === 'processing' && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-navy" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
