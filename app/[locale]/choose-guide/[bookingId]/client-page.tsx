'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, User, MapPin, Languages, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Guide {
  id: number;
  name: string | null;
  cities: string[] | null;
  languages: string[] | null;
  tour_types: string[] | null;
  content: string | null;
  phonenumber: string | null;
  Email: string | null;
  tours_done: number | null;
}

interface Booking {
  id: number;
  tour_id: string | null;
  city: string | null;
  tour_datetime: string | null;
}

export default function ChooseGuideClientPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const bookingId = params.bookingId as string;
  const locale = params.locale as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: We don't redirect anymore - we show sign-in prompt instead

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Only load data if user is admin
    if (!user || !profile) {
      return;
    }

    // Check both isAdmin and is_admin for compatibility
    if (!profile.isAdmin && !profile.is_admin) {
      return;
    }

    async function loadData() {
      try {
        // Get the session token from Supabase client
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/choose-guide/${bookingId}`, {
          credentials: 'include',
          headers,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load booking data' }));
          console.error('[Choose Guide] API error:', {
            status: response.status,
            error: errorData.error || 'Unknown error',
            statusText: response.statusText
          });
          if (response.status === 403) {
            setError(`Unauthorized. Admin access required. Error: ${errorData.error || 'Unknown'}`);
            // Don't redirect immediately - show error first
            return;
          }
          throw new Error(errorData.error || 'Failed to load booking data');
        }
        const data = await response.json();
        setBooking(data.booking);
        setGuides(data.guides || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [bookingId, user, profile, authLoading]);

  const handleConfirm = async () => {
    if (!selectedGuideId) {
      setError('Please select a guide');
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      // Get the session token from Supabase client
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`/api/choose-guide/${bookingId}/confirm`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ guideId: selectedGuideId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm guide selection');
      }

      setConfirmSuccess(true);
    } catch (err) {
      console.error('Error confirming guide:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm guide selection');
    } finally {
      setConfirming(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-600" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    const redirectUrl = `/${locale}/choose-guide/${bookingId}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Sign In Required</h1>
          <p className="mt-2 text-gray-600">Please sign in to choose a guide for this booking.</p>
          <div className="mt-6">
            <Button
              onClick={() => router.push(`/${locale}/auth/sign-in?redirect=${encodeURIComponent(redirectUrl)}`)}
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (user && profile && !profile.isAdmin && !profile.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Admin access required to choose guides.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-600" />
          <p className="mt-4 text-gray-600">Loading guides...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">No Guides Available</h1>
          <p className="mt-2 text-gray-600">No guides have been selected for this booking.</p>
        </div>
      </div>
    );
  }

  if (confirmSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Guide Selected Successfully</h1>
          <p className="mt-2 text-gray-600">
            The guide has been confirmed and the webhook has been triggered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Choose a Guide</h1>
          <p className="mt-2 text-gray-600">Select a guide for this tour booking</p>
          {booking && (
            <div className="mt-4 rounded-lg bg-gray-100 p-4 text-left inline-block">
              <p className="text-sm text-gray-600">Booking ID: <span className="font-semibold">#{booking.id}</span></p>
              {booking.city && (
                <p className="text-sm text-gray-600">City: <span className="font-semibold">{booking.city}</span></p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {guides.map((guide) => (
            <Card
              key={guide.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedGuideId === guide.id
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : ''
              }`}
              onClick={() => setSelectedGuideId(guide.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{guide.name || 'Unnamed Guide'}</CardTitle>
                      {guide.tours_done !== null && guide.tours_done > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{guide.tours_done} tours</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedGuideId === guide.id && (
                    <CheckCircle2 className="h-6 w-6 text-blue-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guide.cities && guide.cities.length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {guide.cities.map((city, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {guide.languages && guide.languages.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Languages className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {guide.languages.map((lang, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {guide.content && (
                    <CardDescription className="line-clamp-3 text-sm">
                      {guide.content}
                    </CardDescription>
                  )}

                  {guide.Email && (
                    <p className="text-xs text-gray-500">Email: {guide.Email}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleConfirm}
            disabled={!selectedGuideId || confirming}
            size="lg"
            className="min-w-[200px]"
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Selection'
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-center">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

