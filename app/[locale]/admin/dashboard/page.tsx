'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { ExternalLink, LogOut, Link as LinkIcon, Home, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  const googleConnectRef = useRef(false);
  const [tours, setTours] = useState<TourRow[]>([]);
  const [toursLoading, setToursLoading] = useState(false);
  const [tourActionLoading, setTourActionLoading] = useState(false);
  const [tourFeedback, setTourFeedback] = useState<string | null>(null);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const initialTourForm: TourFormState = {
    citySlug: '',
    slug: '',
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    badge: '',
    thumbnail: '',
  };
  const [addForm, setAddForm] = useState<TourFormState>(initialTourForm);
  const [editForm, setEditForm] = useState<TourFormState>(initialTourForm);

  const initialGuideForm: GuideFormState = {
    name: '',
    email: '',
    phone: '',
    cities: '',
    languages: '',
    tourTypes: '',
    preferences: '',
    availability: 'available',
  };
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [guideForm, setGuideForm] = useState<GuideFormState>(initialGuideForm);
  const [guideActionLoading, setGuideActionLoading] = useState(false);
  const [guideFeedback, setGuideFeedback] = useState<string | null>(null);

  const handleGuideInputChange = (field: keyof GuideFormState, value: string) => {
    setGuideForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetGuideForm = () => {
    setGuideForm(initialGuideForm);
  };

  const parseCsvList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

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


  const fetchGuides = useCallback(async () => {
    if (!user?.id) return;
    setGuidesLoading(true);
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .order('name');
      if (error) {
        console.error('Failed to fetch guides', error);
        setGuides([]);
        return;
      }
      setGuides((data ?? []) as GuideRow[]);
    } catch (error) {
      console.error('Failed to fetch guides', error);
      setGuides([]);
    } finally {
      setGuidesLoading(false);
    }
  }, [user?.id]);


  const handleAddGuideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = guideForm.name.trim();
    if (!name) {
      setGuideFeedback('Naam is verplicht.');
      return;
    }

    const cities = parseCsvList(guideForm.cities);
    const languages = parseCsvList(guideForm.languages);
    const tourTypes = parseCsvList(guideForm.tourTypes);

    if (cities.length === 0 || languages.length === 0 || tourTypes.length === 0) {
      setGuideFeedback('Geef minstens één stad, taal en tourtype op.');
      return;
    }

    const payload = {
      name,
      email: guideForm.email.trim() || null,
      phone: guideForm.phone.trim() || null,
      cities,
      languages,
      tour_types: tourTypes,
      preferences: guideForm.preferences.trim()
        ? { notes: guideForm.preferences.trim() }
        : {},
      availability: guideForm.availability,
    };

    setGuideActionLoading(true);
    try {
      const { error } = await supabase.from('guides').insert(payload);
      if (error) throw error;
      setGuideFeedback('Gids succesvol toegevoegd.');
      resetGuideForm();
      await fetchGuides();
    } catch (error) {
      console.error('Failed to add guide', error);
      setGuideFeedback('Toevoegen mislukt. Probeer opnieuw.');
    } finally {
      setGuideActionLoading(false);
    }
  };


  useEffect(() => {
    if (!user) return;
    void fetchTeamleaderIntegration();
    void fetchGoogleConnection();
    void fetchGuides();
  }, [user, fetchTeamleaderIntegration, fetchGoogleConnection, fetchGuides]);

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

  const handleGoogleConnect = useCallback(async () => {
    // Prevent multiple simultaneous calls using ref (more reliable than state)
    if (googleConnectRef.current) {
      console.log('Google connect already in progress, skipping...');
      return;
    }

    googleConnectRef.current = true;
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
        googleConnectRef.current = false;
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        setFeedbackMessage(data.error);
        setGoogleConnectInFlight(false);
        googleConnectRef.current = false;
        return;
      }

      if (!data || !data.authorization_url || !data.state) {
        console.error('Missing required fields in response:', data);
        setFeedbackMessage('Failed to initiate Google authorization.');
        setGoogleConnectInFlight(false);
        googleConnectRef.current = false;
        return;
      }

      localStorage.setItem('googleOauthState', data.state);
      // Don't reset the ref here since we're redirecting
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Google authorize error', err);
      setFeedbackMessage('Failed to initiate Google authorization.');
      setGoogleConnectInFlight(false);
      googleConnectRef.current = false;
    }
  }, [locale]);

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

        <div className="grid gap-6 md:grid-cols-1">
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
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nieuwe gids</CardTitle>
              <CardDescription>
                Beheer gidsprofielen voor interne matching. Alleen zichtbaar in het adminpaneel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guideFeedback && (
                <div className="mb-4 rounded border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {guideFeedback}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleAddGuideSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="guideName">Naam</Label>
                    <Input
                      id="guideName"
                      value={guideForm.name}
                      onChange={(event) => handleGuideInputChange('name', event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guideEmail">E-mail</Label>
                    <Input
                      id="guideEmail"
                      type="email"
                      value={guideForm.email}
                      onChange={(event) => handleGuideInputChange('email', event.target.value)}
                      placeholder="optioneel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guidePhone">Telefoon</Label>
                    <Input
                      id="guidePhone"
                      value={guideForm.phone}
                      onChange={(event) => handleGuideInputChange('phone', event.target.value)}
                      placeholder="+32 ..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guideCities">Steden (komma-gescheiden)</Label>
                    <Input
                      id="guideCities"
                      value={guideForm.cities}
                      onChange={(event) => handleGuideInputChange('cities', event.target.value)}
                      placeholder="antwerpen, gent, ..."
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guideLanguages">Talen (komma-gescheiden)</Label>
                    <Input
                      id="guideLanguages"
                      value={guideForm.languages}
                      onChange={(event) => handleGuideInputChange('languages', event.target.value)}
                      placeholder="nl, en, fr"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guideTourTypes">Tourtypes (komma-gescheiden)</Label>
                    <Input
                      id="guideTourTypes"
                      value={guideForm.tourTypes}
                      onChange={(event) => handleGuideInputChange('tourTypes', event.target.value)}
                      placeholder="stad, fiets, maatwerk"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guidePreferences">Voorkeuren / opmerkingen</Label>
                    <Textarea
                      id="guidePreferences"
                      rows={3}
                      value={guideForm.preferences}
                      onChange={(event) => handleGuideInputChange('preferences', event.target.value)}
                      placeholder="Doelgroepen, groepsgrootte, ... (optioneel)"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guideAvailability">Beschikbaarheid</Label>
                    <Select
                      value={guideForm.availability}
                      onValueChange={(value) => handleGuideInputChange('availability', value)}
                    >
                      <SelectTrigger id="guideAvailability">
                        <SelectValue placeholder="Kies status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Beschikbaar</SelectItem>
                        <SelectItem value="limited">Beperkt beschikbaar</SelectItem>
                        <SelectItem value="unavailable">Niet beschikbaar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={guideActionLoading}>
                  Gids toevoegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Gidsen overzicht</CardTitle>
              <CardDescription>
                Niet zichtbaar voor bezoekers — enkel voor matching.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {guidesLoading ? (
                <p className="text-sm text-muted-foreground">Gidsen laden...</p>
              ) : guides.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen gidsen toegevoegd.</p>
              ) : (
                <div className="space-y-3">
                  {guides.map((guide) => (
                    <div key={guide.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-navy">{guide.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {guide.availability === 'available'
                              ? 'Beschikbaar'
                              : guide.availability === 'limited'
                              ? 'Beperkt beschikbaar'
                              : 'Niet beschikbaar'}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{guide.email || 'Geen e-mail'}</p>
                          <p>{guide.phone || 'Geen telefoon'}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>Steden: {guide.cities.join(', ')}</p>
                        <p>Talen: {guide.languages.join(', ')}</p>
                        <p>Tourtypes: {guide.tour_types.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface GuideRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cities: string[];
  languages: string[];
  tour_types: string[];
  preferences: Record<string, unknown>;
  availability: 'available' | 'limited' | 'unavailable';
}

interface GuideFormState {
  name: string;
  email: string;
  phone: string;
  cities: string;
  languages: string;
  tourTypes: string;
  preferences: string;
  availability: 'available' | 'limited' | 'unavailable';
}
