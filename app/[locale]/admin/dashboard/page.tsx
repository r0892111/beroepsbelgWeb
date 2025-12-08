'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, LogOut, Link as LinkIcon, Home, RefreshCw, CheckCircle2, Unlink, Calendar, Users as UsersIcon } from 'lucide-react';
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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConnectInFlight, setGoogleConnectInFlight] = useState(false);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchTeamleaderIntegration = useCallback(async () => {
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
  }, [user?.id]);

  const fetchGoogleConnection = useCallback(async () => {
    if (!user?.id) {
      setGoogleConnected(false);
      return;
    }

    setGoogleLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token, google_refresh_token')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch Google connection', error);
        setGoogleConnected(false);
        return;
      }

      setGoogleConnected(!!(data?.google_access_token && data?.google_refresh_token));
    } catch (error) {
      console.error('Failed to fetch Google connection', error);
      setGoogleConnected(false);
    } finally {
      setGoogleLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void fetchTeamleaderIntegration();
    void fetchGoogleConnection();
  }, [user, fetchTeamleaderIntegration, fetchGoogleConnection]);

  useEffect(() => {
    if (!user) return;

    const teamleaderStatus = searchParams.get('teamleader');
    const googleStatus = searchParams.get('google');

    if (teamleaderStatus === 'connected') {
      setFeedbackMessage(t('teamleaderSuccessShort') || 'Teamleader connected.');
      void fetchTeamleaderIntegration();
      router.replace(`/${locale}/admin/dashboard`);
    }

    if (googleStatus === 'connected') {
      setFeedbackMessage('Google account connected successfully!');
      void fetchGoogleConnection();
      router.replace(`/${locale}/admin/dashboard`);
    }
  }, [user, searchParams, t, router, locale, fetchTeamleaderIntegration, fetchGoogleConnection]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const handleTeamleaderConnect = async () => {
    setFeedbackMessage(null);
    setConnectInFlight(true);
    // Save locale for callback
    localStorage.setItem('userLocale', locale);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        authorization_url?: string;
        state?: string;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'authorize',
          redirect_uri: `${window.location.origin}/admin/teamleader/callback`,
          user_id: user.id,
          locale: locale  // Pass locale separately so callback can redirect back with it
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

  const handleGoogleConnect = async () => {
    setFeedbackMessage(null);
    setGoogleConnectInFlight(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        authorization_url?: string;
        state?: string;
        error?: string;
      }>('google-oauth', {
        body: {
          action: 'authorize',
          redirect_uri: `${window.location.origin}/${locale}/admin/google/callback`
        }
      });

      if (error) {
        console.error('Supabase function invoke error:', error);
        setFeedbackMessage(error.message || 'Failed to initiate Google authorization.');
        setGoogleConnectInFlight(false);
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        setFeedbackMessage(data.error);
        setGoogleConnectInFlight(false);
        return;
      }

      if (!data || !data.authorization_url || !data.state) {
        console.error('Missing required fields in response:', data);
        setFeedbackMessage('Failed to initiate Google authorization.');
        setGoogleConnectInFlight(false);
        return;
      }

      localStorage.setItem('googleOauthState', data.state);
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Google authorize error', err);
      setFeedbackMessage('Failed to initiate Google authorization.');
      setGoogleConnectInFlight(false);
    }
  };

  const handleTeamleaderDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Teamleader?')) {
      return;
    }

    setFeedbackMessage(null);
    setTeamleaderLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'disconnect',
          user_id: user?.id
        }
      });

      if (error || !data?.success) {
        console.error('Failed to disconnect Teamleader', error || data?.error);
        setFeedbackMessage(data?.error || error?.message || 'Failed to disconnect Teamleader.');
        return;
      }

      setFeedbackMessage('Teamleader disconnected successfully.');
      setTeamleaderIntegration(null);
    } catch (error) {
      console.error('Failed to disconnect Teamleader', error);
      setFeedbackMessage('Failed to disconnect Teamleader.');
    } finally {
      setTeamleaderLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google?')) {
      return;
    }

    setFeedbackMessage(null);
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('google-oauth', {
        body: {
          action: 'disconnect'
        }
      });

      if (error || !data?.success) {
        console.error('Failed to disconnect Google', error || data?.error);
        setFeedbackMessage(data?.error || error?.message || 'Failed to disconnect Google.');
        return;
      }

      setFeedbackMessage('Google account disconnected successfully.');
      setGoogleConnected(false);
    } catch (error) {
      console.error('Failed to disconnect Google', error);
      setFeedbackMessage('Failed to disconnect Google.');
    } finally {
      setGoogleLoading(false);
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Manage tours and bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href={`/${locale}/admin/tours`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Manage Tours
                </Button>
              </Link>
              <Link href={`/${locale}/admin/bookings`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Tour Bookings
                </Button>
              </Link>
              <Link href={`/${locale}/admin/products`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Manage Products
                </Button>
              </Link>
              <Link href={`/${locale}/admin/guides`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Manage Guides
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              {t('integrations')}
            </CardTitle>
            <CardDescription>{t('integrationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
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
                {teamleaderIntegration && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTeamleaderDisconnect}
                    disabled={teamleaderLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            <div className="grid flex-1 gap-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-navy">Google Account</h3>
                  <p className="text-sm text-muted-foreground">Connect your Google account for Calendar and other services</p>
                </div>
                <Button
                  onClick={handleGoogleConnect}
                  className="btn-primary"
                  disabled={googleConnectInFlight}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {googleConnected ? 'Reconnect' : 'Connect'}
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-navy">
                  {googleConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchGoogleConnection()}
                  disabled={googleLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
                {googleConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleDisconnect}
                    disabled={googleLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
