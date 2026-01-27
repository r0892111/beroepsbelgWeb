import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatICSDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
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
    
    // Build comprehensive description
    const descriptionParts: string[] = [];
    
    // Tour description
    if (tour?.description) {
      descriptionParts.push(`TOUR DESCRIPTION:\n${tour.description}`);
    }
    
    // Booking details
    descriptionParts.push(`\nBOOKING DETAILS:`);
    descriptionParts.push(`Booking ID: #${booking.id}`);
    descriptionParts.push(`Status: ${booking.status || 'N/A'}`);
    
    // Customer information from invitees
    if (booking.invitees && Array.isArray(booking.invitees) && booking.invitees.length > 0) {
      const mainInvitee = booking.invitees[0] as any;
      descriptionParts.push(`\nCUSTOMER INFORMATION:`);
      if (mainInvitee.name) descriptionParts.push(`Name: ${mainInvitee.name}`);
      if (mainInvitee.email) descriptionParts.push(`Email: ${mainInvitee.email}`);
      if (mainInvitee.phone) descriptionParts.push(`Phone: ${mainInvitee.phone}`);
      if (mainInvitee.numberOfPeople) descriptionParts.push(`Number of People: ${mainInvitee.numberOfPeople}`);
      if (mainInvitee.language) descriptionParts.push(`Language: ${mainInvitee.language}`);
      if (mainInvitee.specialRequests) descriptionParts.push(`Special Requests: ${mainInvitee.specialRequests}`);
      
      // Op maat answers if available
      if (mainInvitee.opMaatAnswers) {
        const opMaat = mainInvitee.opMaatAnswers;
        descriptionParts.push(`\nOP MAAT DETAILS:`);
        if (opMaat.startLocation) descriptionParts.push(`Start Location: ${opMaat.startLocation}`);
        if (opMaat.endLocation) descriptionParts.push(`End Location: ${opMaat.endLocation}`);
        if (opMaat.cityPart) descriptionParts.push(`City Part: ${opMaat.cityPart}`);
        if (opMaat.subjects) descriptionParts.push(`Subjects: ${opMaat.subjects}`);
        if (opMaat.specialWishes) descriptionParts.push(`Special Wishes: ${opMaat.specialWishes}`);
      }
    }
    
    // Tour details
    descriptionParts.push(`\nTOUR INFORMATION:`);
    if (tour?.duration_minutes) {
      const hours = Math.floor(tour.duration_minutes / 60);
      const minutes = tour.duration_minutes % 60;
      const durationStr = hours > 0 
        ? `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`.trim()
        : `${minutes}min`;
      descriptionParts.push(`Duration: ${durationStr}`);
    }
    if (tour?.languages && Array.isArray(tour.languages) && tour.languages.length > 0) {
      descriptionParts.push(`Available Languages: ${tour.languages.join(', ')}`);
    }
    if (startLocation) descriptionParts.push(`Start Location: ${startLocation}`);
    if (endLocation) descriptionParts.push(`End Location: ${endLocation}`);
    if (booking.city) descriptionParts.push(`City: ${booking.city}`);
    
    // Additional tour notes
    if (tour?.notes) {
      descriptionParts.push(`\nNOTES:\n${tour.notes}`);
    }
    
    // Google Maps link
    if (tour?.google_maps_url) {
      descriptionParts.push(`\nGoogle Maps: ${tour.google_maps_url}`);
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

    // Return ICS file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Content-Disposition': `attachment; filename="tour-booking-${booking.id}.ics"`,
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
