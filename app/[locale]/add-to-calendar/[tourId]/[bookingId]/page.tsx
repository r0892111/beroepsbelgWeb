'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { formatBrusselsDateTime } from '@/lib/utils/timezone';

interface TourData {
  title: string;
  start_location: string | null;
  google_maps_url: string | null;
  description: string | null;
  description_en: string | null;
  description_fr: string | null;
  description_de: string | null;
}

interface Invitee {
  name?: string;
  email?: string;
  phone?: string;
  numberOfPeople?: number;
  language?: string;
  specialRequests?: string;
}

interface BookingData {
  id: number;
  tour_id: string | null;
  guide_id: number | null;
  city: string | null;
  tour_datetime: string | null;
  tour_end: string | null;
  invitees: Invitee[] | null;
  start_location: string | null;
  end_location: string | null;
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


export default function AddToCalendarPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const tourId = params.tourId as string;
  const locale = params.locale as string;

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
            invitees,
            start_location,
            end_location,
            tours_table_prod (
              title,
              start_location,
              google_maps_url,
              description,
              description_en,
              description_fr,
              description_de
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
  const location = tour?.start_location || booking.start_location || booking.city || '';
  
  // Get description based on locale, fallback to Dutch (description)
  let tourDescription = tour?.description || '';
  if (locale === 'en' && tour?.description_en) {
    tourDescription = tour.description_en;
  } else if (locale === 'fr' && tour?.description_fr) {
    tourDescription = tour.description_fr;
  } else if (locale === 'de' && tour?.description_de) {
    tourDescription = tour.description_de;
  }
  
  // Build details string with tour description and non-personal booking details
  const detailsParts: string[] = [];
  
  // Add tour description
  if (tourDescription) {
    detailsParts.push(tourDescription);
  }
  
  // Add booking details section (without personal information)
  detailsParts.push('\n--- Booking Details ---');
  
  // Add booking ID
  detailsParts.push(`Booking ID: #${booking.id}`);
  
  // Add non-personal invitee information only
  if (booking.invitees && booking.invitees.length > 0) {
    const mainInvitee = booking.invitees[0];
    if (mainInvitee?.numberOfPeople) {
      detailsParts.push(`Number of People: ${mainInvitee.numberOfPeople}`);
    }
    if (mainInvitee?.specialRequests) {
      detailsParts.push(`Special Requests: ${mainInvitee.specialRequests}`);
    }
  }
  
  // Add locations
  if (booking.start_location) {
    detailsParts.push(`Start Location: ${booking.start_location}`);
  }
  if (booking.end_location) {
    detailsParts.push(`End Location: ${booking.end_location}`);
  }
  
  // Add Google Maps URL if available
  if (tour?.google_maps_url) {
    detailsParts.push(`\nLocation Map: ${tour.google_maps_url}`);
  }
  
  const details = detailsParts.join('\n');

  const calendarUrl = buildGoogleCalendarUrl(
    tourTitle,
    booking.tour_datetime!,
    booking.tour_end!,
    location,
    details
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md mx-auto rounded-lg bg-white p-8 shadow-lg text-center">
        <Calendar className="mx-auto h-16 w-16 text-blue-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Add Tour to Calendar</h1>

        <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Tour:</span> {tourTitle}</p>
          <p><span className="font-medium">Booking ID:</span> #{booking.id}</p>
          {location && <p><span className="font-medium">Location:</span> {location}</p>}
          <p><span className="font-medium">Date:</span> {formatBrusselsDateTime(booking.tour_datetime, 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="mt-6 space-y-3">
          {/* Google Calendar Button */}
          <div>
            <p className="text-sm text-gray-600 mb-3">Add via Google Calendar:</p>
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

          {/* Message about email invite */}
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">
              Don't use Google Calendar? You can find a calendar invite (.ics file) in your confirmation email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
