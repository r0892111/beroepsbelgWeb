'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, User, MapPin, Languages, Star, Clock } from 'lucide-react';
import { format } from 'date-fns';
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
  selectionStatus: 'offered' | 'declined' | 'accepted' | null;
  offeredAt: string | null;
  respondedAt: string | null;
}

interface Booking {
  id: number;
  tour_id: string | null;
  city: string | null;
  tour_datetime: string | null;
  deal_id: string | null;
}

export default function ChooseGuideClientPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const bookingId = params.bookingId as string;
  const locale = params.locale as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [allGuides, setAllGuides] = useState<Guide[]>([]);
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

        // Fetch all guides from database
        const { data: allGuidesData, error: guidesError } = await supabase
          .from('guides_temp')
          .select('id, name, cities, languages, tour_types, content, phonenumber, Email, tours_done')
          .order('name', { ascending: true });

        if (!guidesError && allGuidesData) {
          // Convert to Guide format
          const formattedGuides: Guide[] = allGuidesData.map((g: any) => ({
            id: g.id,
            name: g.name,
            cities: g.cities,
            languages: g.languages,
            tour_types: g.tour_types,
            content: g.content,
            phonenumber: g.phonenumber,
            Email: g.Email,
            tours_done: g.tours_done,
            selectionStatus: null,
            offeredAt: null,
            respondedAt: null,
          }));
          setAllGuides(formattedGuides);
        }
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

  // Check if there are any available guides to select
  const availableGuides = guides.filter(g => !g.selectionStatus);
  const declinedGuides = guides.filter(g => g.selectionStatus === 'declined');
  const offeredGuides = guides.filter(g => g.selectionStatus === 'offered');

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
          
          {/* Status summary */}
          {guides.length > 0 && (
            <div className="mt-4 flex justify-center gap-4 text-sm">
              {availableGuides.length > 0 && (
                <span className="text-blue-600">{availableGuides.length} available</span>
              )}
              {offeredGuides.length > 0 && (
                <span className="text-yellow-600">{offeredGuides.length} waiting for response</span>
              )}
              {declinedGuides.length > 0 && (
                <span className="text-red-600">{declinedGuides.length} declined</span>
              )}
            </div>
          )}
          
          {/* Message when no suggested guides */}
          {guides.length === 0 && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                No guides have been suggested for this booking. Please select a guide from the complete list below.
              </p>
            </div>
          )}
          
          {/* Warning when no available guides but some suggested */}
          {availableGuides.length === 0 && guides.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 max-w-md mx-auto">
              <p className="text-sm text-amber-800">
                {offeredGuides.length > 0 
                  ? 'All guides have been offered. Waiting for responses.'
                  : 'All suggested guides have declined or been offered. Please select a guide from the complete list below.'}
              </p>
            </div>
          )}
        </div>

        {/* Show declined guides summary if any */}
        {declinedGuides.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 max-w-2xl mx-auto">
            <p className="text-sm text-red-800 font-medium mb-2">
              {declinedGuides.length} guide{declinedGuides.length > 1 ? 's' : ''} declined or cancelled:
            </p>
            <div className="flex flex-wrap gap-2">
              {declinedGuides.map((g) => (
                <span key={g.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  {g.name || `Guide #${g.id}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Guides Section */}
        {guides.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Suggested Guides</h2>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Only show available and offered guides - exclude declined */}
          {guides.filter(g => g.selectionStatus !== 'declined').map((guide) => {
            const isOffered = guide.selectionStatus === 'offered';
            const isAvailable = !guide.selectionStatus;
            const isSelectable = isAvailable;
            
            return (
              <Card
                key={guide.id}
                className={`transition-all ${
                  isSelectable ? 'cursor-pointer hover:shadow-lg' : 'opacity-60'
                } ${
                  selectedGuideId === guide.id
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                } ${isOffered ? 'bg-yellow-50 border-yellow-200' : ''}`}
                onClick={() => isSelectable && setSelectedGuideId(guide.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isOffered ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {isOffered ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <User className="h-5 w-5 text-blue-600" />
                        )}
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
                    <div className="flex flex-col items-end gap-1">
                      {selectedGuideId === guide.id && (
                        <CheckCircle2 className="h-6 w-6 text-blue-500" />
                      )}
                      {isOffered && (
                        <Badge className="bg-yellow-500 text-xs">
                          Waiting
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* Show timestamp for offered guides */}
                  {isOffered && guide.offeredAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Offered: {format(new Date(guide.offeredAt), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
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
            );
          })}
            </div>
          </div>
        )}

        {/* All Guides Section */}
        {allGuides.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">All Available Guides</h2>
            <p className="mb-4 text-sm text-gray-600">Select any guide from the complete list below</p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allGuides.map((guide) => {
                // Check if this guide is already in the suggested guides
                const isInSuggested = guides.some(g => g.id === guide.id);
                const suggestedGuide = guides.find(g => g.id === guide.id);
                const isOffered = suggestedGuide?.selectionStatus === 'offered';
                const isDeclined = suggestedGuide?.selectionStatus === 'declined';
                const isSelectable = !isDeclined;
                
                return (
                  <Card
                    key={guide.id}
                    className={`transition-all ${
                      isSelectable ? 'cursor-pointer hover:shadow-lg' : 'opacity-60'
                    } ${
                      selectedGuideId === guide.id
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : ''
                    } ${isOffered ? 'bg-yellow-50 border-yellow-200' : ''} ${isInSuggested ? 'border-blue-300' : ''}`}
                    onClick={() => isSelectable && setSelectedGuideId(guide.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isOffered ? 'bg-yellow-100' : isInSuggested ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            {isOffered ? (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <User className="h-5 w-5 text-gray-600" />
                            )}
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
                        <div className="flex flex-col items-end gap-1">
                          {selectedGuideId === guide.id && (
                            <CheckCircle2 className="h-6 w-6 text-blue-500" />
                          )}
                          {isInSuggested && (
                            <Badge className="bg-blue-500 text-xs">
                              Suggested
                            </Badge>
                          )}
                          {isOffered && (
                            <Badge className="bg-yellow-500 text-xs">
                              Waiting
                            </Badge>
                          )}
                          {isDeclined && (
                            <Badge className="bg-red-500 text-xs">
                              Declined
                            </Badge>
                          )}
                        </div>
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
                );
              })}
            </div>
          </div>
        )}

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

