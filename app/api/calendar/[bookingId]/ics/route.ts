import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Format date for ICS file in UTC
 * The dateString is stored as Brussels timezone (e.g., "2025-01-25T14:00:00+01:00")
 * We need to convert it to UTC for ICS format (YYYYMMDDTHHmmssZ)
 */
function formatICSDate(dateString: string): string {
  // Parse the date string - JavaScript will correctly interpret the timezone offset
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  // Extract UTC components for ICS format (ICS requires UTC times)
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  // Return in ICS format: YYYYMMDDTHHmmssZ (UTC)
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateICSContent(
  title: string,
  startDate: string,
  endDate: string,
  location: string,
  description: string,
  bookingId: number
): string {
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

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const bookingId = params.bookingId;

    // Fetch comprehensive booking data
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select(`
        id,
        tour_id,
        tour_datetime,
        tour_end,
        city,
        start_location,
        end_location,
        status,
        invitees,
        tours_table_prod (
          title,
          description,
          description_en,
          description_fr,
          description_de,
          start_location,
          end_location,
          google_maps_url,
          duration_minutes,
          languages,
          notes
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (!booking.tour_datetime || !booking.tour_end) {
      return NextResponse.json(
        { error: 'Tour dates not set' },
        { status: 400 }
      );
    }

    // Handle both array and object response from Supabase join
    const tourData = booking.tours_table_prod;
    const tour: any = Array.isArray(tourData) ? tourData[0] : tourData;
    const tourTitle = tour?.title || 'Tour';
    
    // Determine location (booking-specific locations take precedence)
    const startLocation = booking.start_location || tour?.start_location || booking.city || '';
    const endLocation = booking.end_location || tour?.end_location || '';
    const location = endLocation ? `${startLocation} → ${endLocation}` : startLocation;
    
    // Build description - only include tour info and number of people (no personal info)
    const descriptionParts: string[] = [];
    
    // Tour description
    if (tour?.description) {
      descriptionParts.push(tour.description);
    }
    
    // Number of people only (no other personal info)
    if (booking.invitees && Array.isArray(booking.invitees) && booking.invitees.length > 0) {
      const mainInvitee = booking.invitees[0] as any;
      if (mainInvitee.numberOfPeople) {
        descriptionParts.push(`\nNumber of People: ${mainInvitee.numberOfPeople}`);
      }
    }
    
    // Tour information
    if (tour?.duration_minutes) {
      const hours = Math.floor(tour.duration_minutes / 60);
      const minutes = tour.duration_minutes % 60;
      const durationStr = hours > 0 
        ? `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`.trim()
        : `${minutes}min`;
      descriptionParts.push(`Duration: ${durationStr}`);
    }
    if (tour?.languages && Array.isArray(tour.languages) && tour.languages.length > 0) {
      descriptionParts.push(`Languages: ${tour.languages.join(', ')}`);
    }
    if (startLocation) descriptionParts.push(`Start: ${startLocation}`);
    if (endLocation) descriptionParts.push(`End: ${endLocation}`);
    
    // Additional tour notes
    if (tour?.notes) {
      descriptionParts.push(`\n${tour.notes}`);
    }
    
    // Google Maps link
    if (tour?.google_maps_url) {
      descriptionParts.push(`\n${tour.google_maps_url}`);
    }
    
    const fullDescription = descriptionParts.join('\n');

    // Generate ICS content
    const icsContent = generateICSContent(
      tourTitle,
      booking.tour_datetime,
      booking.tour_end,
      location,
      fullDescription,
      booking.id
    );

    // Return ICS file with proper headers for direct calendar app opening
    // No Content-Disposition header - allows mobile browsers to open calendar app directly
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating ICS file:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
