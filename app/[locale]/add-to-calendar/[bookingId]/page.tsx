'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';

interface BookingData {
  id: number;
  tour_id: string | null;
  guide_id: number | null;
  google_calendar_link: string | null;
  city: string | null;
  tour_datetime: string | null;
}

export default function AddToCalendarPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const { data, error: fetchError } = await supabase
          .from('tourbooking')
          .select('id, tour_id, guide_id, google_calendar_link, city, tour_datetime')
          .eq('id', bookingId)
          .single();

        if (fetchError) {
          throw new Error('Booking not found');
        }

        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Error</h1>
          <p className="mt-2 text-gray-600">{error || 'Booking not found'}</p>
        </div>
      </div>
    );
  }

  if (!booking.google_calendar_link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Calendar Link Not Available</h1>
          <p className="mt-2 text-gray-600">The calendar link for this booking is not yet available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <Calendar className="mx-auto h-16 w-16 text-blue-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Add Tour to Calendar</h1>

        <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Booking ID:</span> #{booking.id}</p>
          {booking.city && <p><span className="font-medium">City:</span> {booking.city}</p>}
          {booking.tour_datetime && (
            <p><span className="font-medium">Date:</span> {new Date(booking.tour_datetime).toLocaleString()}</p>
          )}
        </div>

        <div className="mt-6">
          <a
            href={booking.google_calendar_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src="https://calendar.google.com/calendar/images/ext/gc_button1_en.gif"
              alt="Add to Google Calendar"
              className="border-0"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
