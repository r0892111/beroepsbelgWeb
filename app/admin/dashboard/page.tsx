'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/lib/contexts/admin-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, RefreshCw, Users, ShoppingCart, Calendar, LogOut, Link as LinkIcon, CheckCircle2, Home } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const {
    isAuthenticated,
    logout,
    teamleaderIntegration,
    refreshTeamleaderIntegration,
    teamleaderLoading,
    loading
  } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connectInFlight, setConnectInFlight] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const status = searchParams.get('teamleader');
    if (status === 'connected') {
      setFeedbackMessage(t('teamleaderSuccessShort'));
      void refreshTeamleaderIntegration();
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, searchParams, t, refreshTeamleaderIntegration, router]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const handleTeamleaderConnect = async () => {
    setFeedbackMessage(null);
    setConnectInFlight(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        authorization_url?: string;
        state?: string;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'authorize',
          redirect_uri: `${window.location.origin}/admin/teamleader/callback`
        }
      });

      console.log('Teamleader authorize response:', { data, error });

      if (error) {
        console.error('Supabase function invoke error:', error);
        setFeedbackMessage(error.message || t('teamleaderAuthorizeError'));
        setConnectInFlight(false);
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        setFeedbackMessage(data.error);
        setConnectInFlight(false);
        return;
      }

      // Check if we have the required fields (more lenient success check)
      if (!data || !data.authorization_url || !data.state) {
        console.error('Missing required fields in response:', data);
        setFeedbackMessage(t('teamleaderAuthorizeError'));
        setConnectInFlight(false);
        return;
      }

      console.log('Storing OAuth state:', data.state);
      localStorage.setItem('teamleaderOauthState', data.state);
      
      // Verify it was stored
      const verifyState = localStorage.getItem('teamleaderOauthState');
      console.log('Verified stored state:', verifyState);
      
      if (verifyState !== data.state) {
        console.error('Failed to store state in localStorage');
        setFeedbackMessage(t('teamleaderAuthorizeError'));
        setConnectInFlight(false);
        return;
      }

      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Teamleader authorize error', err);
      setFeedbackMessage(t('teamleaderAuthorizeError'));
      setConnectInFlight(false);
    }
  };


  const integrationStatus = useMemo(() => {
    if (!teamleaderIntegration) {
      return t('teamleaderStatusDisconnected');
    }

    const userInfo = teamleaderIntegration as Record<string, unknown>;
    const firstName = typeof userInfo?.first_name === 'string' ? userInfo.first_name : '';
    const lastName = typeof userInfo?.last_name === 'string' ? userInfo.last_name : '';
    const email = typeof userInfo?.email === 'string' ? userInfo.email : '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || email || t('teamleaderUnknownUser') || 'Unknown User';
    return t('teamleaderStatusConnected', { name });
  }, [teamleaderIntegration, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">{t('dashboard')}</h1>
          <div className="flex items-center gap-2">
            <Link href="/nl">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                {t('home') || 'Home'}
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {feedbackMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalBookings')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCustomers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t('integrations')}
              </CardTitle>
              <CardDescription>{t('integrationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-navy">Teamleader CRM</h3>
                    <p className="text-sm text-muted-foreground">{t('teamleaderDescription')}</p>
                  </div>
                  <Button
                    onClick={handleTeamleaderConnect}
                    className="btn-primary"
                    disabled={connectInFlight}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {teamleaderIntegration ? t('teamleaderReconnect') : t('connect')}
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-navy">{integrationStatus}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshTeamleaderIntegration()}
                    disabled={teamleaderLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('teamleaderRefresh')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
              <CardDescription>{t('quickActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                {t('manageBookings')}
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Users className="h-4 w-4 mr-2" />
                {t('viewCustomers')}
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t('viewOrders')}
              </Button>
              <p className="text-xs text-muted-foreground pt-2">{t('comingSoon')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

