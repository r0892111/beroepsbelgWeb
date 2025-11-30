'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/tourbooking?stripe_session_id=eq.${sessionId}&select=*,tours_table_prod(*)`,
          {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const bookingData = data[0];
            const invitee = bookingData.invitees?.[0];

            setBooking({
              ...bookingData,
              customer_name: invitee?.name,
              customer_email: invitee?.email,
              customer_phone: invitee?.phone,
              number_of_people: invitee?.numberOfPeople,
              language: invitee?.language,
              special_requests: invitee?.specialRequests,
              amount: invitee?.amount,
              booking_date: bookingData.tour_datetime,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !booking) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>We couldn't find your booking details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
          <CardDescription>
            Your tour has been successfully booked. You will receive a confirmation email shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Tour:</span>
              <span className="text-muted-foreground">{booking.tours_table_prod?.title || 'Tour'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Date:</span>
              <span className="text-muted-foreground">
                {new Date(booking.booking_date).toLocaleDateString('nl-BE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Number of People:</span>
              <span className="text-muted-foreground">{booking.number_of_people}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Language:</span>
              <span className="text-muted-foreground uppercase">{booking.language}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Customer Name:</span>
              <span className="text-muted-foreground">{booking.customer_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Email:</span>
              <span className="text-muted-foreground">{booking.customer_email}</span>
            </div>
            <div className="flex justify-between pt-4">
              <span className="text-lg font-bold">Total Paid:</span>
              <span className="text-lg font-bold">€{booking.amount.toFixed(2)}</span>
            </div>
          </div>

          {booking.special_requests && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">Special Requests:</p>
              <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>What's Next?</strong>
              <br />
              You will receive a confirmation email with all the details and meeting point information.
              If you have any questions, please don't hesitate to contact us.
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/tours">Browse More Tours</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
