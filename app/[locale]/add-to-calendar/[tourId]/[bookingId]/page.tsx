'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';

interface BookingData {
  id: number;
  tour_id: string | null;
  guide_id: number | null;
  city: string | null;
  tour_datetime: string | null;
  tour_end: string | null;
  tours_table_prod: {
    title: string;
    start_location: string | null;
  }[] | null;
}

function formatDateForCalendar(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildGoogleCalendarUrl(
  title: string,
  startDate: string,
  endDate: string,
  location: string,
  details: string
): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`,
    location: location,
    details: details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function AddToCalendarPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const tourId = params.tourId as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const { data, error: fetchError } = await supabase
          .from('tourbooking')
          .select(`
            id,
            tour_id,
            guide_id,
            city,
            tour_datetime,
            tour_end,
            tours_table_prod (
              title,
              start_location
            )
          `)
          .eq('id', bookingId)
          .eq('tour_id', tourId)
          .single();

        if (fetchError || !data) {
          throw new Error('Booking not found');
        }

        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    if (bookingId && tourId) {
      fetchBooking();
    }
  }, [bookingId, tourId]);

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

  if (!booking.tour_datetime || !booking.tour_end) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Calendar Link Not Available</h1>
          <p className="mt-2 text-gray-600">The tour dates for this booking are not yet set.</p>
        </div>
      </div>
    );
  }

  const tour = booking.tours_table_prod?.[0];
  const tourTitle = booking?.tours_table_prod?.[0]?.title || tour?.title || 'Tour';
  const location = tour?.start_location || booking.city || '';
  const details = `Booking #${booking.id}`;

  const calendarUrl = buildGoogleCalendarUrl(
    tourTitle,
    booking.tour_datetime,
    booking.tour_end,
    location,
    details
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <Calendar className="mx-auto h-16 w-16 text-blue-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Add Tour to Calendar</h1>

        <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Tour:</span> {tourTitle}</p>
          <p><span className="font-medium">Booking ID:</span> #{booking.id}</p>
          {location && <p><span className="font-medium">Location:</span> {location}</p>}
          <p><span className="font-medium">Date:</span> {new Date(booking.tour_datetime).toLocaleString()}</p>
        </div>

        <div className="mt-6">
          <a
            href={calendarUrl}
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
