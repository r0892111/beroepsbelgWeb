'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, LogOut, Link as LinkIcon, Home, RefreshCw, CheckCircle2, Unlink, Calendar, Users as UsersIcon, HelpCircle, MapPin, Image, Package, FileText, Building2, BookOpen, BarChart3, Newspaper, Mail, FileEdit, Warehouse } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { user, profile, signOut, loading: authLoading } = useAuth();
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
  const [goedgepicktConnected, setGoedgepicktConnected] = useState(false);
  const [goedgepicktLoading, setGoedgepicktLoading] = useState(false);
  const [goedgepicktDialogOpen, setGoedgepicktDialogOpen] = useState(false);
  const [goedgepicktApiKey, setGoedgepicktApiKey] = useState('');
  const [goedgepicktTesting, setGoedgepicktTesting] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking admin access
    if (authLoading) return;
    
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale, authLoading]);

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

  const fetchGoedgepicktConnection = useCallback(async () => {
    if (!user?.id) {
      setGoedgepicktConnected(false);
      return;
    }

    setGoedgepicktLoading(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) {
        setGoedgepicktConnected(false);
        return;
      }

      const response = await fetch('/api/goedgepickt', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setGoedgepicktConnected(false);
        return;
      }

      const data = await response.json();
      setGoedgepicktConnected(data.connected || false);
    } catch (error) {
      setGoedgepicktConnected(false);
    } finally {
      setGoedgepicktLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void fetchTeamleaderIntegration();
    void fetchGoogleConnection();
    void fetchGoedgepicktConnection();
  }, [user, fetchTeamleaderIntegration, fetchGoogleConnection, fetchGoedgepicktConnection]);

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
    if (!user) return;

    setFeedbackMessage(null);
    setConnectInFlight(true);
    // Save locale for callback
    localStorage.setItem('userLocale', locale);
    try {
      // Get the correct origin (production URL or current origin)
      const getOrigin = () => {
        if (typeof window === 'undefined') return 'https://beroepsbelg.be';
        // In production, always use the production URL
        if (window.location.hostname === 'beroepsbelg.be' || window.location.hostname.includes('beroepsbelg')) {
          return 'https://beroepsbelg.be';
        }
        return window.location.origin;
      };
      
      const redirectUri = `${getOrigin()}/admin/teamleader/callback`;
      
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        authorization_url?: string;
        state?: string;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'authorize',
          redirect_uri: redirectUri,
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
        setFeedbackMessage(data?.error || error?.message || 'Failed to disconnect Google.');
        return;
      }

      setFeedbackMessage('Google account disconnected successfully.');
      setGoogleConnected(false);
    } catch (error) {
      setFeedbackMessage('Failed to disconnect Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoedgepicktConnect = () => {
    setGoedgepicktApiKey('');
    setGoedgepicktDialogOpen(true);
  };

  const handleGoedgepicktTest = async () => {
    if (!goedgepicktApiKey.trim()) {
      setFeedbackMessage('Please enter an API key');
      return;
    }

    setGoedgepicktTesting(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) {
        setFeedbackMessage('Authentication required');
        return;
      }

      const response = await fetch('/api/goedgepickt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'test',
          apiKey: goedgepicktApiKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackMessage('API key is valid!');
      } else {
        setFeedbackMessage(data.error || 'Invalid API key');
      }
    } catch (error) {
      setFeedbackMessage('Failed to test API key');
    } finally {
      setGoedgepicktTesting(false);
    }
  };

  const handleGoedgepicktSave = async () => {
    if (!goedgepicktApiKey.trim()) {
      setFeedbackMessage('Please enter an API key');
      return;
    }

    setGoedgepicktTesting(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) {
        setFeedbackMessage('Authentication required');
        return;
      }

      const response = await fetch('/api/goedgepickt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'save',
          apiKey: goedgepicktApiKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackMessage(t('goedgepicktSuccess') || 'GoedGepickt API key saved successfully!');
        setGoedgepicktDialogOpen(false);
        setGoedgepicktApiKey('');
        void fetchGoedgepicktConnection();
      } else {
        setFeedbackMessage(data.error || t('goedgepicktInvalidKey') || 'Invalid API key');
      }
    } catch (error) {
      setFeedbackMessage('Failed to save API key');
    } finally {
      setGoedgepicktTesting(false);
    }
  };

  const handleGoedgepicktDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GoedGepickt?')) {
      return;
    }

    setFeedbackMessage(null);
    setGoedgepicktLoading(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) {
        setFeedbackMessage('Authentication required');
        return;
      }

      const response = await fetch('/api/goedgepickt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'delete',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackMessage(t('goedgepicktDisconnectSuccess') || 'GoedGepickt disconnected successfully.');
        setGoedgepicktConnected(false);
      } else {
        setFeedbackMessage(data.error || t('goedgepicktDisconnectError') || 'Failed to disconnect GoedGepickt.');
      }
    } catch (error) {
      setFeedbackMessage('Failed to disconnect GoedGepickt.');
    } finally {
      setGoedgepicktLoading(false);
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

  // Wait for auth to finish loading before checking admin access
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <Link href={`/${locale}/admin/orders`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Package className="h-5 w-5 mr-2" />
                  Orders
                </Button>
              </Link>
              <Link href={`/${locale}/admin/guides`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Manage Guides
                </Button>
              </Link>
              <Link href={`/${locale}/admin/faq`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Manage FAQ
                </Button>
              </Link>
              <Link href={`/${locale}/admin/job-applications`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Job Applications
                </Button>
              </Link>
              <Link href={`/${locale}/admin/airbnb`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Building2 className="h-5 w-5 mr-2" />
                  AirBNB Listings
                </Button>
              </Link>
              <Link href={`/${locale}/admin/lectures`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Manage Lectures
                </Button>
              </Link>
              <Link href={`/${locale}/admin/blogs`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <FileEdit className="h-5 w-5 mr-2" />
                  Manage Blogs
                </Button>
              </Link>
              <Link href={`/${locale}/admin/press`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Newspaper className="h-5 w-5 mr-2" />
                  Manage Press
                </Button>
              </Link>
              <Link href={`/${locale}/admin/newsletter`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <Mail className="h-5 w-5 mr-2" />
                  Manage Newsletter
                </Button>
              </Link>
              <Link href={`/${locale}/admin/guide-behaviour`}>
                <Button className="w-full justify-start btn-primary" size="lg">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Guide Behaviour
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">Teamleader CRM</h3>
                  <p className="text-sm text-muted-foreground">{t('teamleaderDescription')}</p>
                </div>
                <Button
                  onClick={handleTeamleaderConnect}
                  className="btn-primary w-full sm:w-auto"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">Google Account</h3>
                  <p className="text-sm text-muted-foreground">Connect your Google account for Calendar and other services</p>
                </div>
                <Button
                  onClick={handleGoogleConnect}
                  className="btn-primary w-full sm:w-auto"
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

            <div className="grid flex-1 gap-4 rounded-lg border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">GoedGepickt Fulfilment</h3>
                  <p className="text-sm text-muted-foreground">{t('goedgepicktDescription')}</p>
                </div>
                <Button
                  onClick={handleGoedgepicktConnect}
                  className="btn-primary w-full sm:w-auto"
                  disabled={goedgepicktLoading}
                >
                  <Warehouse className="h-4 w-4 mr-2" />
                  {goedgepicktConnected ? (t('goedgepicktUpdateApiKey') || 'Update API Key') : (t('goedgepicktConnect') || t('connect'))}
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-navy">
                  {goedgepicktConnected ? (t('goedgepicktConnected') || 'Connected') : (t('goedgepicktDisconnected') || 'Disconnected')}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchGoedgepicktConnection()}
                  disabled={goedgepicktLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('goedgepicktRefresh') || 'Refresh Status'}
                </Button>
                {goedgepicktConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoedgepicktDisconnect}
                    disabled={goedgepicktLoading}
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

        <Dialog open={goedgepicktDialogOpen} onOpenChange={setGoedgepicktDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('goedgepicktConnect') || 'Connect GoedGepickt'}</DialogTitle>
              <DialogDescription>
                {t('goedgepicktApiKeyHelp') || 'Enter your GoedGepickt API key. You can generate one in GoedGepickt > Settings > GoedGepickt API.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder={t('goedgepicktApiKeyPlaceholder') || 'Enter your GoedGepickt API key'}
                  value={goedgepicktApiKey}
                  onChange={(e) => setGoedgepicktApiKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleGoedgepicktSave();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setGoedgepicktDialogOpen(false);
                  setGoedgepicktApiKey('');
                }}
                disabled={goedgepicktTesting}
              >
                {t('goedgepicktCancel') || 'Cancel'}
              </Button>
              <Button
                variant="outline"
                onClick={handleGoedgepicktTest}
                disabled={goedgepicktTesting || !goedgepicktApiKey.trim()}
              >
                {goedgepicktTesting ? (t('goedgepicktTesting') || 'Testing...') : (t('goedgepicktTestConnection') || 'Test Connection')}
              </Button>
              <Button
                onClick={handleGoedgepicktSave}
                disabled={goedgepicktTesting || !goedgepicktApiKey.trim()}
                className="btn-primary"
              >
                {goedgepicktTesting ? (t('goedgepicktSaving') || 'Saving...') : (t('goedgepicktSave') || 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
