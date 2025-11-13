'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/lib/contexts/admin-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, RefreshCw, Users, ShoppingCart, Calendar, LogOut, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const {
    isAuthenticated,
    logout,
    teamleaderIntegration,
    refreshTeamleaderIntegration,
    teamleaderLoading
  } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [connectInFlight, setConnectInFlight] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const storedSession = localStorage.getItem('teamleaderSessionUrl');
    setSessionLink(storedSession && storedSession.length > 0 ? storedSession : null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const status = searchParams.get('teamleader');
    if (status === 'connected') {
      setFeedbackMessage(t('teamleaderSuccessShort'));
      const storedSession = localStorage.getItem('teamleaderSessionUrl');
      setSessionLink(storedSession && storedSession.length > 0 ? storedSession : null);
      void refreshTeamleaderIntegration();
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, searchParams, t, refreshTeamleaderIntegration, router]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const handleTeamleaderConnect = () => {
    const clientId = process.env.TEAMLEADER_CLIENT_ID;
    if (!clientId) {
      setFeedbackMessage(t('teamleaderMissingClientId'));
      return;
    }

    const redirectUri =
      process.env.NEXT_PUBLIC_TEAMLEADER_REDIRECT_URI ??
      `${window.location.origin}/admin/teamleader/callback`;
    const scope =
      process.env.NEXT_PUBLIC_TEAMLEADER_SCOPE ??
      'users.me contacts groups companies deals invoices.products invoices bookings';

    const authorizationUrl = new URL('https://app.teamleader.eu/oauth2/authorize');
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('scope', scope);
    authorizationUrl.searchParams.set('state', crypto.randomUUID());

    setConnectInFlight(true);
    window.location.href = authorizationUrl.toString();
  };

  const handleOpenSession = () => {
    if (sessionLink) {
      window.open(sessionLink, '_blank', 'noopener,noreferrer');
    }
  };

  const integrationStatus = useMemo(() => {
    if (!teamleaderIntegration) {
      return t('teamleaderStatusDisconnected');
    }

    const userInfo = teamleaderIntegration.user_info as Record<string, unknown>;
    const nameParts = [
      typeof userInfo?.first_name === 'string' ? userInfo.first_name : null,
      typeof userInfo?.last_name === 'string' ? userInfo.last_name : null
    ].filter(Boolean);

    const name = nameParts.length > 0 ? nameParts.join(' ') : userInfo?.email ?? '';
    return t('teamleaderStatusConnected', { name: name || t('teamleaderUnknownUser') });
  }, [teamleaderIntegration, t]);

  const lastUpdated = useMemo(() => {
    if (!teamleaderIntegration?.updated_at) return null;
    try {
      return new Date(teamleaderIntegration.updated_at).toLocaleString();
    } catch {
      return null;
    }
  }, [teamleaderIntegration]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">{t('dashboard')}</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('logout')}
          </Button>
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
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      {t('teamleaderLastUpdated', { date: lastUpdated })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSession}
                    disabled={!sessionLink}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('teamleaderOpenSession')}
                  </Button>
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

