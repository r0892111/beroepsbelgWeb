'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

const WEBHOOK_URL = 'https://alexfinit.app.n8n.cloud/webhook/8f09be45-a954-4903-b0a0-cbfb3fd52154';

// Valid locales for the app
const VALID_LOCALES = ['en', 'nl', 'fr', 'de'];
const DEFAULT_LOCALE = 'en';

export default function AftercareConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const guideId = (params.guideId as string) || ''; // Handle optional guideId
  const rawLocale = params.locale as string;
  // Default to English if locale is invalid or not in valid locales list
  const locale = VALID_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'present' | 'absent' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) {
        toast.error('Missing booking ID');
        return;
      }

      try {
        // Parse booking ID - can be a number (like 551) or UUID format
        const bookingIdNum = parseInt(bookingId, 10);
        const isNumericId = !isNaN(bookingIdNum);

        // Fetch booking by booking id (numeric ID)
        const { data: bookingData, error: bookingError } = await supabase
          .from('tourbooking')
          .select('*')
          .eq('id', isNumericId ? bookingIdNum : bookingId)
          .maybeSingle();

        if (bookingError || !bookingData) {
          toast.error('Booking not found');
          return;
        }

        setBooking(bookingData);

        // Fetch guide - prioritize guideId from URL if provided
        if (guideId && guideId !== '') {
          const guideIdNum = parseInt(guideId, 10);
          if (!isNaN(guideIdNum)) {
            const { data: guideData, error: guideError } = await supabase
              .from('guides_temp')
              .select('id, name')
              .eq('id', guideIdNum)
              .single();

            if (!guideError && guideData) {
              setGuide(guideData);
            }
            // If guide from URL not found, don't fall back to booking's guide_id
            // The URL parameter should always take precedence
          }
        } else if (bookingData.guide_id) {
          // Only fetch booking's guide_id if guideId is NOT in URL
          const { data: guideData, error: guideError } = await supabase
            .from('guides_temp')
            .select('id, name')
            .eq('id', bookingData.guide_id)
            .single();

          if (!guideError && guideData) {
            setGuide(guideData);
          }
        }
      } catch (error) {
        toast.error('Failed to load booking information');
      }
    };

    void fetchData();
  }, [bookingId, guideId]);

  const handleSubmit = async (customerPresent: boolean) => {
    if (!booking) {
      toast.error('Missing booking information');
      return;
    }

    setLoading(true);
    setSubmissionStatus(customerPresent ? 'present' : 'absent');

    try {
      // Get guide_id from URL parameter, booking, or guide state
      const finalGuideId = guideId && guideId !== '' 
        ? parseInt(guideId, 10) 
        : (booking.guide_id || guide?.id || null);

      // Only send webhook when customer is present
      
        // Prepare payload for webhook
        const payload = {
          type: 'customer_presence_confirmation',
          booking_id: booking.id,
          guide_id: finalGuideId,
          customer_present: customerPresent,
          confirmed_at: new Date().toISOString(),
          booking: booking, // Include full booking data
        };

        // Send to webhook
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }
      

      setSubmitted(true);
      toast.success(
        customerPresent
          ? 'Customer presence confirmed'
          : 'Customer absence reported'
      );
    } catch (error) {
      toast.error('Failed to submit confirmation. Please try again.');
      setSubmissionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brass" />
            </div>
            <p className="text-center mt-4 text-slate-blue">Loading booking information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              {submissionStatus === 'present' ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  <span>Customer Present</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="h-6 w-6" />
                  <span>Customer Absent</span>
                </div>
              )}
            </CardTitle>
            <CardDescription className="text-center">
              Your response has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 text-center">
                  Thank you for confirming the customer's presence status.
                </p>
              </div>
              <Button
                onClick={() => router.push(`/${locale}`)}
                className="w-full"
                variant="outline"
              >
                Return to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Customer Presence Confirmation</CardTitle>
          <CardDescription className="text-center">
            Please confirm whether the customer was present at the meeting spot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {guide && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Guide:</span> {guide.name}
              </p>
            </div>
          )}

          {booking && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Booking ID:</span> {booking.id}
              </p>
              {booking.city && (
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">City:</span> {booking.city}
                </p>
              )}
              {booking.tour_datetime && (
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Tour Date:</span>{' '}
                  {new Date(booking.tour_datetime).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-16 text-lg"
            >
              {loading && submissionStatus === 'present' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Customer is Present
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-16 text-lg"
            >
              {loading && submissionStatus === 'absent' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  Customer is Absent
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
