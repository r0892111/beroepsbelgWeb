'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, User, MapPin, Calendar, Clock } from 'lucide-react';

interface Guide {
  id: number;
  name: string | null;
  Email: string | null;
  phonenumber: string | null;
}

interface Tour {
  id: string;
  title: string;
}

interface Booking {
  id: number;
  deal_id: string;
  guide_id: number | null;
  tour_id: string | null;
  city: string | null;
  tour_datetime: string | null;
  status: string;
  guide: Guide | null;
  tour: Tour | null;
}

export default function ConfirmGuideClientPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ action: 'accept' | 'decline' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      try {
        const response = await fetch(`/api/confirm-guide/${dealId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load booking' }));
          throw new Error(errorData.error || 'Failed to load booking');
        }
        const data = await response.json();
        setBooking(data.booking);
      } catch (err) {
        console.error('Error loading booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [dealId]);

  const handleAction = async (action: 'accept' | 'decline') => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/confirm-guide/${dealId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} assignment`);
      }

      setSuccess({ action });
    } catch (err) {
      console.error(`Error ${action}ing assignment:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} assignment`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-600" />
          <p className="mt-4 text-gray-600">Loading assignment details...</p>
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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Assignment {success.action === 'accept' ? 'Accepted' : 'Declined'}
          </h1>
          <p className="mt-2 text-gray-600">
            You have successfully {success.action}ed this assignment. The webhook has been triggered.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Assignment Not Found</h1>
          <p className="mt-2 text-gray-600">No assignment found for this deal ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Confirm Your Assignment</h1>
          <p className="mt-2 text-gray-600">Please review the details and confirm or decline this assignment</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Review the tour assignment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Guide</p>
                <p className="text-base font-semibold text-gray-900">
                  {booking.guide?.name || 'Not assigned'}
                </p>
                {booking.guide?.Email && (
                  <p className="text-sm text-gray-500">{booking.guide.Email}</p>
                )}
              </div>
            </div>

            {booking.tour && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Tour</p>
                  <p className="text-base font-semibold text-gray-900">{booking.tour.title}</p>
                </div>
              </div>
            )}

            {booking.city && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">City</p>
                  <p className="text-base font-semibold text-gray-900">{booking.city}</p>
                </div>
              </div>
            )}

            {booking.tour_datetime && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Date & Time</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(booking.tour_datetime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.tour_datetime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-base font-semibold text-gray-900 capitalize">{booking.status}</p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-600">Deal ID</p>
              <p className="text-sm font-mono text-gray-900">{booking.deal_id}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            onClick={() => handleAction('accept')}
            disabled={processing}
            size="lg"
            className="flex-1 sm:flex-initial min-w-[150px] bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept Assignment
              </>
            )}
          </Button>

          <Button
            onClick={() => handleAction('decline')}
            disabled={processing}
            size="lg"
            variant="destructive"
            className="flex-1 sm:flex-initial min-w-[150px]"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Decline Assignment
              </>
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

