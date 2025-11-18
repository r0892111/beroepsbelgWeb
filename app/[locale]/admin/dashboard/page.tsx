'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, Users, ShoppingCart, Calendar, LogOut, Link as LinkIcon, Home, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const [teamleaderIntegration, setTeamleaderIntegration] = useState<Record<string, unknown> | null>(null);
  const [teamleaderLoading, setTeamleaderLoading] = useState(false);
  const [connectInFlight, setConnectInFlight] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  useEffect(() => {
    if (!user) return;
    void fetchTeamleaderIntegration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const status = searchParams.get('teamleader');
    if (status === 'connected') {
      setFeedbackMessage(t('teamleaderSuccessShort') || 'Teamleader connected.');
      void fetchTeamleaderIntegration();
      router.replace(`/${locale}/admin/dashboard`);
    }
  }, [user, searchParams, t, router, locale]);

  const fetchTeamleaderIntegration = async () => {
    if (!user?.id) {
      setTeamleaderIntegration(null);
      return;
    }

    setTeamleaderLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        integration?: Record<string, unknown>;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'status',
          user_id: user.id
        }
      });

      if (error || !data?.success) {
        console.error('Failed to fetch Teamleader integration', error || data?.error);
        setTeamleaderIntegration(null);
        return;
      }

      setTeamleaderIntegration(data.integration ?? null);
    } catch (error) {
      console.error('Failed to fetch Teamleader integration', error);
      setTeamleaderIntegration(null);
    } finally {
      setTeamleaderLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
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
        setFeedbackMessage(error.message || t('teamleaderAuthorizeError') || 'Failed to initiate authorization.');
        setConnectInFlight(false);
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        setFeedbackMessage(data.error);
        setConnectInFlight(false);
        return;
      }

      if (!data || !data.authorization_url || !data.state) {
        console.error('Missing required fields in response:', data);
        setFeedbackMessage(t('teamleaderAuthorizeError') || 'Failed to initiate authorization.');
        setConnectInFlight(false);
        return;
      }

      console.log('Storing OAuth state:', data.state);
      localStorage.setItem('teamleaderOauthState', data.state);

      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Teamleader authorize error', err);
      setFeedbackMessage(t('teamleaderAuthorizeError') || 'Failed to initiate authorization.');
      setConnectInFlight(false);
    }
  };

  const integrationStatus = useMemo(() => {
    if (!teamleaderIntegration) {
      return t('teamleaderStatusDisconnected') || 'Disconnected';
    }

    const integration = teamleaderIntegration as Record<string, unknown>;
    const userInfo = (integration.user_info as Record<string, unknown>) || integration;
    const firstName = typeof userInfo?.first_name === 'string' ? userInfo.first_name : '';
    const lastName = typeof userInfo?.last_name === 'string' ? userInfo.last_name : '';
    const email = typeof userInfo?.email === 'string' ? userInfo.email : '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || email || t('teamleaderUnknownUser') || 'Unknown User';
    return t('teamleaderStatusConnected', { name }) || `Connected as ${name}`;
  }, [teamleaderIntegration, t]);

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">{t('dashboard')}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}`}>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t('integrations')}
              </CardTitle>
              <CardDescription>{t('integrationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="grid flex-1 gap-4 rounded-lg border p-4">
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
                    {teamleaderIntegration ? (t('teamleaderReconnect') || 'Reconnect') : t('connect')}
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-navy">{integrationStatus}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchTeamleaderIntegration()}
                    disabled={teamleaderLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('teamleaderRefresh') || 'Refresh Status'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
              <CardDescription>{t('quickActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="space-y-2">
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
              </div>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
