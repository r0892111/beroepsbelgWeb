'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Calendar, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBrusselsDateTime } from '@/lib/utils/timezone';

interface TourData {
  title: string;
  start_location: string | null;
  google_maps_url: string | null;
}

interface BookingData {
  id: number;
  tour_id: string | null;
  guide_id: number | null;
  city: string | null;
  tour_datetime: string | null;
  tour_end: string | null;
  tours_table_prod: TourData | TourData[] | null;
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

function generateICSContent(
  title: string,
  startDate: string,
  endDate: string,
  location: string,
  description: string,
  bookingId: number
): string {
  // Format dates for ICS (YYYYMMDDTHHmmssZ format)
  const formatICSDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  // Escape special characters in ICS format
  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const icsStart = formatICSDate(startDate);
  const icsEnd = formatICSDate(endDate);
  const icsTitle = escapeICS(title);
  const icsLocation = escapeICS(location);
  const icsDescription = escapeICS(description || `Booking ID: ${bookingId}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beroepsbelg//Tour Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${bookingId}@beroepsbelg.be`,
    `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
    `DTSTART:${icsStart}`,
    `DTEND:${icsEnd}`,
    `SUMMARY:${icsTitle}`,
    `LOCATION:${icsLocation}`,
    `DESCRIPTION:${icsDescription}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Removed downloadICS function - now using direct API link for better mobile support

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
              start_location,
              google_maps_url
            )
          `)
          .eq('id', bookingId)
          .eq('tour_id', tourId)
          .single();

        if (fetchError || !data) {
          console.error('Fetch error:', fetchError);
          throw new Error('Booking not found');
        }

        console.log('Booking data:', JSON.stringify(data, null, 2));
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

  // Handle both array and object response from Supabase join
  const tourData = booking.tours_table_prod;
  const tour: TourData | null = Array.isArray(tourData) ? tourData[0] : tourData;
  const tourTitle = tour?.title || 'Tour';
  const location = tour?.start_location || booking.city || '';
  const details = tour?.google_maps_url || '';

  const calendarUrl = buildGoogleCalendarUrl(
    tourTitle,
    booking.tour_datetime!,
    booking.tour_end!,
    location,
    details
  );

  // Use API route for ICS file - works better on mobile
  const icsUrl = `/api/calendar/${booking.id}/ics`;

  // Handler for direct calendar add - opens calendar app without download
  const handleAddToCalendar = () => {
    // Direct navigation to ICS file
    // Mobile browsers (iOS Safari, Android Chrome) will automatically
    // open the calendar app when they encounter an ICS file with proper Content-Type
    window.location.href = icsUrl;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <Calendar className="mx-auto h-16 w-16 text-blue-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Add Tour to Calendar</h1>

        <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Tour:</span> {tourTitle}</p>
          <p><span className="font-medium">Booking ID:</span> #{booking.id}</p>
          {location && <p><span className="font-medium">Location:</span> {location}</p>}
          <p><span className="font-medium">Date:</span> {formatBrusselsDateTime(booking.tour_datetime, 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="mt-6 space-y-3">
          {/* Primary: Add to Calendar Button - Works on all phones */}
          <Button
            onClick={handleAddToCalendar}
            size="lg"
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Calendar className="h-5 w-5" />
            Add to Calendar
          </Button>
          <p className="text-xs text-gray-500">
            Tap to open your calendar app with this event
          </p>

          {/* Alternative: Google Calendar Button */}
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600 mb-3">Or add via Google Calendar:</p>
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

          {/* Fallback: Direct ICS Link */}
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">Direct calendar file link:</p>
            <a
              href={icsUrl}
              className="text-xs text-blue-600 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {icsUrl}
            </a>
            <p className="text-xs text-gray-400 mt-1">
              Works with Apple Calendar, Google Calendar, Outlook, and more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
