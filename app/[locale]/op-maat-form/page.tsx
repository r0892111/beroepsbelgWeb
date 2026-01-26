'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, MapPin, Compass, BookOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

interface Booking {
  id: string;
  tour_id: string;
  tour_datetime: string;
  tour_end: string;
  status: string;
  city: string;
  invitees: Array<{
    name: string;
    email: string;
    phone: string;
    numberOfPeople: number;
    language: string;
    opMaatAnswers?: {
      startLocation?: string;
      endLocation?: string;
      startEnd?: string; // Keep for backward compatibility
      cityPart?: string;
      subjects?: string;
      specialWishes?: string;
      extraHour?: boolean;
    };
    [key: string]: any;
  }>;
  created_at: string;
  [key: string]: any;
}

interface OpMaatFormConfig {
  startLocation: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
  endLocation: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
  startEnd: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
  cityPart: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
  subjects: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
  specialWishes: {
    label: { nl?: string; en?: string; fr?: string; de?: string };
    placeholder: { nl?: string; en?: string; fr?: string; de?: string };
  };
}

interface Tour {
  id: string;
  title: string;
  description: string;
  city: string;
  options?: {
    op_maat_form_config?: OpMaatFormConfig;
    [key: string]: any;
  };
  [key: string]: any;
}

export default function OpMaatFormPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const tourId = searchParams.get('tourId');
  const bookingId = searchParams.get('bookingId');
  const t = useTranslations('opMaatForm');
  const locale = (params.locale as string) || 'nl';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [formConfig, setFormConfig] = useState<OpMaatFormConfig | null>(null);

  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    cityPart: '',
    subjects: '',
    specialWishes: '',
  });

  // Helper function to get label/placeholder from config or fallback to translation
  const getFormText = (field: 'startLocation' | 'endLocation' | 'startEnd' | 'cityPart' | 'subjects' | 'specialWishes', type: 'label' | 'placeholder', fallbackKey: string): string => {
    if (formConfig?.[field]?.[type]) {
      const configText = formConfig[field][type][locale as 'nl' | 'en' | 'fr' | 'de'] || 
                        formConfig[field][type].nl || 
                        '';
      if (configText.trim()) {
        return configText;
      }
    }
    return t(fallbackKey) || '';
  };

  // Load booking and tour data
  useEffect(() => {
    async function loadData() {
      if (!tourId || !bookingId) {
        setError('Missing tourId or bookingId in URL');
        setLoading(false);
        return;
      }

      try {
        // Fetch booking from tourbooking table (used by B2B quote flow)
        const { data: bookingData, error: bookingError } = await supabase
          .from('tourbooking')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          setError('Booking not found');
          setLoading(false);
          return;
        }

        setBooking(bookingData);

        // Pre-fill form if op_maat_answers already exist in invitees
        const mainInvitee = bookingData.invitees?.[0];
        if (mainInvitee?.opMaatAnswers) {
          // Handle both new format (separate fields) and old format (combined startEnd)
          const startEndText = mainInvitee.opMaatAnswers.startEnd || '';
          setFormData({
            startLocation: mainInvitee.opMaatAnswers.startLocation || (startEndText ? startEndText.split(',')[0].replace(/^start\s+bij\s*/i, '').trim() : ''),
            endLocation: mainInvitee.opMaatAnswers.endLocation || '',
            cityPart: mainInvitee.opMaatAnswers.cityPart || '',
            subjects: mainInvitee.opMaatAnswers.subjects || '',
            specialWishes: mainInvitee.opMaatAnswers.specialWishes || '',
          });
        }

        // Fetch tour
        const { data: tourData, error: tourError } = await supabase
          .from('tours_table_prod')
          .select('*')
          .eq('id', tourId)
          .single();

        if (!tourError && tourData) {
          setTour(tourData);
          
          // Extract op maat form config from tour options
          if (tourData.options && typeof tourData.options === 'object') {
            const config = (tourData.options as any).op_maat_form_config;
            if (config) {
              setFormConfig(config);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    }

    loadData();
  }, [tourId, bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // First fetch the current booking to get existing invitees
      const { data: currentBooking, error: fetchCurrentError } = await supabase
        .from('tourbooking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchCurrentError || !currentBooking) {
        console.error('Error fetching current booking:', fetchCurrentError);
        throw new Error('Failed to fetch booking');
      }

      // Extract start and end locations directly from separate fields
      const parsedStartLocation = formData.startLocation.trim() || null;
      const parsedEndLocation = formData.endLocation.trim() || null;

      // Update the invitees array with op maat answers and tour times
      const updatedInvitees = currentBooking.invitees?.map((invitee: any, index: number) => {
        if (index === 0) { // Update the first invitee (main contact)
          return {
            ...invitee,
            opMaatAnswers: {
              ...(invitee.opMaatAnswers || {}),
              startLocation: formData.startLocation,
              endLocation: formData.endLocation,
              cityPart: formData.cityPart,
              subjects: formData.subjects,
              specialWishes: formData.specialWishes,
            },
            // Always update tour times from the booking (in case they were set after initial booking)
            tourStartDatetime: currentBooking.tour_datetime || invitee.tourStartDatetime,
            tourEndDatetime: currentBooking.tour_end || invitee.tourEndDatetime,
            isContacted: true, 
          };
        }
        return invitee;
      }) || [];

      // Update booking with op maat answers in invitees AND extracted start/end locations
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({
          invitees: updatedInvitees,
          start_location: parsedStartLocation,
          end_location: parsedEndLocation,
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        throw new Error('Failed to save answers');
      }

      // Fetch the updated booking for the webhook
      const { data: updatedBooking, error: fetchError } = await supabase
        .from('tourbooking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        console.error('Error fetching updated booking:', fetchError);
        throw new Error('Failed to fetch updated booking');
      }

      // Trigger webhook via API route (to avoid CORS issues)
      try {
        const webhookResponse = await fetch('/api/op-maat-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking: updatedBooking,
            tour: tour,
            opMaatAnswers: formData,
            submittedAt: new Date().toISOString(),
          }),
        });

        if (!webhookResponse.ok) {
          const errorData = await webhookResponse.json().catch(() => ({}));
          console.error('Webhook error:', errorData);
        }
      } catch (webhookError) {
        // Don't fail if webhook fails, just log it
        console.error('Webhook error:', webhookError);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0EB] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1a3628] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !booking) {
    return (
      <div className="min-h-screen bg-[#F0F0EB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F0F0EB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-[#1a3628]">
              {t('thankYou') || 'Bedankt!'}
            </CardTitle>
            <CardDescription className="text-base">
              {t('submittedMessage') || 'Je voorkeuren zijn succesvol opgeslagen. We nemen contact met je op om de details van je tour op maat te bespreken.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0EB] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a3628] mb-2">
            {t('title') || 'Tour Op Maat'}
          </h1>
          <p className="text-gray-600">
            {t('subtitle') || 'Vertel ons over je ideale tour, zodat we deze perfect kunnen afstemmen op jouw wensen.'}
          </p>
        </div>

        {/* Booking info */}
        {booking && (
          <Card className="mb-6 bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('bookingDetails') || 'Boeking Details'}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('name') || 'Naam'}:</span>
                <p className="font-medium">{booking.invitees?.[0]?.name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('date') || 'Datum'}:</span>
                <p className="font-medium">
                  {booking.tour_datetime 
                    ? new Date(booking.tour_datetime).toLocaleDateString('nl-BE')
                    : '-'
                  }
                </p>
              </div>
              <div>
                <span className="text-gray-500">{t('time') || 'Tijd'}:</span>
                <p className="font-medium">
                  {booking.tour_datetime 
                    ? new Date(booking.tour_datetime).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
                    : '-'
                  }
                </p>
              </div>
              <div>
                <span className="text-gray-500">{t('groupSize') || 'Groepsgrootte'}:</span>
                <p className="font-medium">{booking.invitees?.[0]?.numberOfPeople || 1} {t('persons') || 'personen'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('formTitle') || 'Jouw Voorkeuren'}</CardTitle>
            <CardDescription>
              {t('formDescription') || 'Beantwoord onderstaande vragen zodat we je tour perfect kunnen voorbereiden.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Start Location */}
              <div className="space-y-2">
                <Label htmlFor="startLocation" className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-5 w-5 text-[#1BDD95]" />
                  {getFormText('startLocation', 'label', 'startLocationLabel') || 'Waar wil je beginnen?'}
                </Label>
                <Input
                  id="startLocation"
                  placeholder={getFormText('startLocation', 'placeholder', 'startLocationPlaceholder') || 'Bijvoorbeeld: Centraal Station, Grote Markt...'}
                  value={formData.startLocation}
                  onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
                  required
                />
              </div>

              {/* End Location */}
              <div className="space-y-2">
                <Label htmlFor="endLocation" className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-5 w-5 text-[#1BDD95]" />
                  {getFormText('endLocation', 'label', 'endLocationLabel') || 'Waar wil je eindigen?'}
                </Label>
                <Input
                  id="endLocation"
                  placeholder={getFormText('endLocation', 'placeholder', 'endLocationPlaceholder') || 'Bijvoorbeeld: Het stadhuis, MAS museum...'}
                  value={formData.endLocation}
                  onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
                  required
                />
              </div>

              {/* City Part */}
              <div className="space-y-2">
                <Label htmlFor="cityPart" className="flex items-center gap-2 text-base font-semibold">
                  <Compass className="h-5 w-5 text-[#1BDD95]" />
                  {getFormText('cityPart', 'label', 'cityPartLabel') || 'Welk deel van de stad wil je ontdekken?'}
                </Label>
                <Textarea
                  id="cityPart"
                  placeholder={getFormText('cityPart', 'placeholder', 'cityPartPlaceholder') || 'Bijvoorbeeld: De historische binnenstad, de moderne wijk, de markten...'}
                  value={formData.cityPart}
                  onChange={(e) => setFormData({ ...formData, cityPart: e.target.value })}
                  className="min-h-[100px]"
                  rows={4}
                  required
                />
              </div>

              {/* Subjects */}
              <div className="space-y-2">
                <Label htmlFor="subjects" className="flex items-center gap-2 text-base font-semibold">
                  <BookOpen className="h-5 w-5 text-[#1BDD95]" />
                  {getFormText('subjects', 'label', 'subjectsLabel') || 'Welke onderwerpen interesseren je?'}
                </Label>
                <Textarea
                  id="subjects"
                  placeholder={getFormText('subjects', 'placeholder', 'subjectsPlaceholder') || 'Bijvoorbeeld: Architectuur, geschiedenis, lokale cultuur, eten en drinken...'}
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                  className="min-h-[100px]"
                  rows={4}
                  required
                />
              </div>

              {/* Special Wishes */}
              <div className="space-y-2">
                <Label htmlFor="specialWishes" className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-5 w-5 text-[#1BDD95]" />
                  {getFormText('specialWishes', 'label', 'specialWishesLabel') || 'Heb je speciale wensen of opmerkingen?'}
                </Label>
                <Textarea
                  id="specialWishes"
                  placeholder={getFormText('specialWishes', 'placeholder', 'specialWishesPlaceholder') || 'Bijvoorbeeld: Toegankelijkheid, specifieke interesses, voorkeuren...'}
                  value={formData.specialWishes}
                  onChange={(e) => setFormData({ ...formData, specialWishes: e.target.value })}
                  className="min-h-[100px]"
                  rows={4}
                />
                <p className="text-sm text-gray-500">{t('optional') || '(Optioneel)'}</p>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitting || !formData.startLocation.trim() || !formData.endLocation.trim() || !formData.cityPart.trim() || !formData.subjects.trim()}
                className="w-full h-12 text-lg"
                style={{
                  backgroundColor: '#1a3628',
                  color: 'white',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('submitting') || 'Versturen...'}
                  </>
                ) : (
                  t('submit') || 'Voorkeuren Versturen'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('footerNote') || 'Na het invullen van dit formulier nemen we contact met je op om de details van je tour op maat te bespreken.'}
        </p>
      </div>
    </div>
  );
}
