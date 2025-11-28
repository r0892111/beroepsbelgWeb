'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { ExternalLink, Users, ShoppingCart, Calendar, LogOut, Link as LinkIcon, Home, RefreshCw, CheckCircle2, Trash2, Pencil } from 'lucide-react';
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

  const handleAddInputChange = (field: keyof TourFormState, value: string) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field: keyof TourFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetEditState = () => {
    setEditingTourId(null);
    setEditForm(initialTourForm);
  };

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

  const fetchToursAdmin = useCallback(async () => {
    if (!user?.id) return;
    setToursLoading(true);
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('id, city_slug, slug, title_nl, short_description_nl, description_nl, price, badge, thumbnail')
        .order('city_slug')
        .order('slug');

      if (error) {
        console.error('Failed to fetch tours', error);
        setTours([]);
        return;
      }
      setTours((data ?? []) as TourRow[]);
    } catch (error) {
      console.error('Failed to fetch tours', error);
      setTours([]);
    } finally {
      setToursLoading(false);
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

  const handleAddTourSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const citySlug = addForm.citySlug.trim();
    const slug = addForm.slug.trim();
    const title = addForm.title.trim();
    const shortDescription = addForm.shortDescription.trim();
    if (!citySlug || !slug || !title || !shortDescription) {
      setTourFeedback('Gelieve alle verplichte velden in te vullen.');
      return;
    }
    let priceNumber: number | null = null;
    if (addForm.price.trim()) {
      const parsed = Number.parseFloat(addForm.price.trim().replace(',', '.'));
      if (Number.isNaN(parsed)) {
        setTourFeedback('Prijs moet een geldig getal zijn.');
        return;
      }
      priceNumber = parsed;
    }
    const description = addForm.description.trim() || shortDescription;
    const badge = addForm.badge.trim() || null;
    const thumbnail = addForm.thumbnail.trim() || null;

    const payload = {
      city_slug: citySlug,
      slug,
      price: priceNumber,
      badge,
      thumbnail,
      title_nl: title,
      title_en: title,
      title_fr: title,
      title_de: title,
      short_description_nl: shortDescription,
      short_description_en: shortDescription,
      short_description_fr: shortDescription,
      short_description_de: shortDescription,
      description_nl: description,
      description_en: description,
      description_fr: description,
      description_de: description,
    };

    setTourActionLoading(true);
    try {
      const { error } = await supabase.from('tours').insert(payload);
      if (error) throw error;
      setTourFeedback('Tour succesvol toegevoegd.');
      setAddForm(initialTourForm);
      await fetchToursAdmin();
    } catch (error) {
      console.error('Failed to save tour', error);
      setTourFeedback('Opslaan mislukt. Probeer het opnieuw.');
    } finally {
      setTourActionLoading(false);
    }
  };

  const handleEditTourSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTourId) {
      setTourFeedback('Geen tour geselecteerd om te bewerken.');
      return;
    }
    const citySlug = editForm.citySlug.trim();
    const slug = editForm.slug.trim();
    const title = editForm.title.trim();
    const shortDescription = editForm.shortDescription.trim();
    if (!citySlug || !slug || !title || !shortDescription) {
      setTourFeedback('Gelieve alle verplichte velden in te vullen.');
      return;
    }
    let priceNumber: number | null = null;
    if (editForm.price.trim()) {
      const parsed = Number.parseFloat(editForm.price.trim().replace(',', '.'));
      if (Number.isNaN(parsed)) {
        setTourFeedback('Prijs moet een geldig getal zijn.');
        return;
      }
      priceNumber = parsed;
    }
    const description = editForm.description.trim() || shortDescription;
    const badge = editForm.badge.trim() || null;
    const thumbnail = editForm.thumbnail.trim() || null;

    const payload = {
      city_slug: citySlug,
      slug,
      price: priceNumber,
      badge,
      thumbnail,
      title_nl: title,
      title_en: title,
      title_fr: title,
      title_de: title,
      short_description_nl: shortDescription,
      short_description_en: shortDescription,
      short_description_fr: shortDescription,
      short_description_de: shortDescription,
      description_nl: description,
      description_en: description,
      description_fr: description,
      description_de: description,
    };

    setTourActionLoading(true);
    try {
      const { error } = await supabase.from('tours').update(payload).eq('id', editingTourId);
      if (error) throw error;
      setTourFeedback('Tour succesvol bijgewerkt.');
      resetEditState();
      await fetchToursAdmin();
    } catch (error) {
      console.error('Failed to update tour', error);
      setTourFeedback('Opslaan mislukt. Probeer het opnieuw.');
    } finally {
      setTourActionLoading(false);
    }
  };

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

  const handleEditTour = (tour: TourRow) => {
    setEditForm({
      citySlug: tour.city_slug,
      slug: tour.slug,
      title: tour.title_nl ?? '',
      shortDescription: tour.short_description_nl ?? '',
      description: tour.description_nl ?? '',
      price: tour.price !== null && tour.price !== undefined ? tour.price.toString() : '',
      badge: tour.badge ?? '',
      thumbnail: tour.thumbnail ?? '',
    });
    setEditingTourId(tour.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTourForEdit = (tourId: string) => {
    if (tourId === 'none') {
      resetEditState();
      return;
    }
    const selected = tours.find((tour) => tour.id === tourId);
    if (selected) {
      handleEditTour(selected);
    }
  };

  const handleDeleteTour = async (tour: TourRow) => {
    if (!window.confirm(`Weet je zeker dat je "${tour.title_nl}" wilt verwijderen?`)) {
      return;
    }
    setTourActionLoading(true);
    try {
      const { error } = await supabase.from('tours').delete().eq('id', tour.id);
      if (error) throw error;
      setTourFeedback('Tour verwijderd.');
      if (editingTourId === tour.id) {
        resetEditState();
      }
      await fetchToursAdmin();
    } catch (error) {
      console.error('Failed to delete tour', error);
      setTourFeedback('Verwijderen mislukt. Probeer het opnieuw.');
    } finally {
      setTourActionLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void fetchTeamleaderIntegration();
    void fetchToursAdmin();
    void fetchGuides();
  }, [user, fetchTeamleaderIntegration, fetchToursAdmin, fetchGuides]);

  useEffect(() => {
    if (!user) return;

    const status = searchParams.get('teamleader');
    if (status === 'connected') {
      setFeedbackMessage(t('teamleaderSuccessShort') || 'Teamleader connected.');
      void fetchTeamleaderIntegration();
      router.replace(`/${locale}/admin/dashboard`);
    }
  }, [user, searchParams, t, router, locale, fetchTeamleaderIntegration]);

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

        <div className="grid gap-6 md:grid-cols-1">
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

        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Beheer tours</CardTitle>
              <CardDescription>
                Voeg nieuwe tours toe of werk bestaande items bij. Vul de velden in één taal — ze worden automatisch gekopieerd naar alle talen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tourFeedback && (
                <div className="mb-4 rounded border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {tourFeedback}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleAddTourSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="citySlug">City slug</Label>
                    <Input
                      id="citySlug"
                      value={addForm.citySlug}
                      onChange={(event) => handleAddInputChange('citySlug', event.target.value)}
                      placeholder="bv. antwerpen"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Tour slug</Label>
                    <Input
                      id="slug"
                      value={addForm.slug}
                      onChange={(event) => handleAddInputChange('slug', event.target.value)}
                      placeholder="bv. cafelegendes"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prijs (EUR)</Label>
                    <Input
                      id="price"
                      value={addForm.price}
                      onChange={(event) => handleAddInputChange('price', event.target.value)}
                      placeholder="bv. 24.95"
                    />
                  </div>
                  <div>
                    <Label htmlFor="badge">Badge</Label>
                    <Input
                      id="badge"
                      value={addForm.badge}
                      onChange={(event) => handleAddInputChange('badge', event.target.value)}
                      placeholder="EXCLUSIEF / UITVERKOCHT / NIEUW"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      value={addForm.title}
                      onChange={(event) => handleAddInputChange('title', event.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="shortDescription">Korte beschrijving</Label>
                    <Textarea
                      id="shortDescription"
                      value={addForm.shortDescription}
                      onChange={(event) => handleAddInputChange('shortDescription', event.target.value)}
                      rows={2}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="description">Uitgebreide beschrijving</Label>
                    <Textarea
                      id="description"
                      value={addForm.description}
                      onChange={(event) => handleAddInputChange('description', event.target.value)}
                      rows={4}
                      placeholder="Optioneel"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="thumbnail">Afbeelding URL</Label>
                    <Input
                      id="thumbnail"
                      value={addForm.thumbnail}
                      onChange={(event) => handleAddInputChange('thumbnail', event.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <Button type="submit" disabled={tourActionLoading}>
                  Tour toevoegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Tour bewerken</CardTitle>
              <CardDescription>
                Selecteer een tour of kies eentje in de lijst om bij te werken.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {tours.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Er zijn momenteel geen tours beschikbaar om te bewerken.
                </p>
              ) : (
                <>
                  <div className="mb-4">
                    <Label htmlFor="tourSelect">Selecteer tour</Label>
                    <Select
                      value={editingTourId ?? 'none'}
                      onValueChange={handleSelectTourForEdit}
                    >
                      <SelectTrigger id="tourSelect">
                        <SelectValue placeholder="Kies een tour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {tours.map((tour) => (
                          <SelectItem key={tour.id} value={tour.id}>
                            {tour.title_nl} ({tour.city_slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingTourId ? (
                    <form className="space-y-4" onSubmit={handleEditTourSubmit}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="editCitySlug">City slug</Label>
                          <Input
                            id="editCitySlug"
                            value={editForm.citySlug}
                            onChange={(event) => handleEditInputChange('citySlug', event.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="editSlug">Tour slug</Label>
                          <Input
                            id="editSlug"
                            value={editForm.slug}
                            onChange={(event) => handleEditInputChange('slug', event.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPrice">Prijs (EUR)</Label>
                          <Input
                            id="editPrice"
                            value={editForm.price}
                            onChange={(event) => handleEditInputChange('price', event.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editBadge">Badge</Label>
                          <Input
                            id="editBadge"
                            value={editForm.badge}
                            onChange={(event) => handleEditInputChange('badge', event.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="editTitle">Titel</Label>
                          <Input
                            id="editTitle"
                            value={editForm.title}
                            onChange={(event) => handleEditInputChange('title', event.target.value)}
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="editShortDescription">Korte beschrijving</Label>
                          <Textarea
                            id="editShortDescription"
                            rows={2}
                            value={editForm.shortDescription}
                            onChange={(event) => handleEditInputChange('shortDescription', event.target.value)}
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="editDescription">Uitgebreide beschrijving</Label>
                          <Textarea
                            id="editDescription"
                            rows={4}
                            value={editForm.description}
                            onChange={(event) => handleEditInputChange('description', event.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="editThumbnail">Afbeelding URL</Label>
                          <Input
                            id="editThumbnail"
                            value={editForm.thumbnail}
                            onChange={(event) => handleEditInputChange('thumbnail', event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={tourActionLoading}>
                          Wijzigingen opslaan
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetEditState}
                          disabled={tourActionLoading}
                        >
                          Annuleren
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Kies een tour hierboven om te bewerken.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Bestaande tours</CardTitle>
            <CardDescription>Overzicht van alle tours in Supabase</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {toursLoading ? (
              <p className="text-sm text-muted-foreground">Tours laden...</p>
            ) : tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen tours gevonden.</p>
            ) : (
              <div className="space-y-3">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-navy">{tour.title_nl}</p>
                        <p className="text-xs text-muted-foreground">{tour.city_slug} · {tour.slug}</p>
                      </div>
                      <div className="text-sm font-semibold">
                        {tour.price ? `€${tour.price.toFixed(2)}` : '-'}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {tour.short_description_nl}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTour(tour)}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Bewerken
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTour(tour)}
                        disabled={tourActionLoading}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Verwijderen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

interface TourRow {
  id: string;
  city_slug: string;
  slug: string;
  title_nl: string;
  short_description_nl: string;
  description_nl?: string | null;
  price: number | null;
  badge?: string | null;
  thumbnail?: string | null;
}

interface TourFormState {
  citySlug: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  price: string;
  badge: string;
  thumbnail: string;
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
