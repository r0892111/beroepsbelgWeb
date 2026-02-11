import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Parse URL parameter which is in format "bookingId-guideId" (e.g., "551-18")
function parseBookingAndGuideId(param: string): { bookingId: number; guideId: number | null } {
  const parts = param.split('-');
  
  if (parts.length >= 2) {
    // Last part is guide_id
    const guideId = parseInt(parts[parts.length - 1], 10);
    // Everything except last part is booking_id
    const bookingId = parseInt(parts.slice(0, -1).join('-'), 10);
    
    if (!isNaN(bookingId) && !isNaN(guideId)) {
      return { bookingId, guideId };
    }
  }
  
  // Fallback: treat entire string as booking ID (backward compatibility)
  const bookingId = parseInt(param, 10);
  return { bookingId: isNaN(bookingId) ? 0 : bookingId, guideId: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    if (!dealId) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Parse booking ID and guide ID from URL format "bookingId-guideId"
    const { bookingId, guideId: urlGuideId } = parseBookingAndGuideId(dealId);

    if (!bookingId || bookingId === 0) {
      return NextResponse.json(
        { error: 'Invalid booking ID format. Expected format: bookingId-guideId' },
        { status: 400 }
      );
    }

    // Fetch the booking by booking id (numeric ID)
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id, guide_ids, tour_id, city, tour_datetime, tour_end, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get guide IDs from guide_ids array or fall back to guide_id for backward compatibility
    const currentGuideIds = booking.guide_ids && booking.guide_ids.length > 0 
      ? booking.guide_ids 
      : booking.guide_id 
        ? [booking.guide_id] 
        : [];

    // Fetch guide details - use guide_id from URL if provided, otherwise use first guide from guide_ids or guide_id
    let guide = null;
    const guideIdToFetch = urlGuideId || (currentGuideIds.length > 0 ? currentGuideIds[0] : null);
    if (guideIdToFetch) {
      const { data: guideData } = await supabase
        .from('guides_temp')
        .select('id, name, Email, phonenumber')
        .eq('id', guideIdToFetch)
        .single();
      guide = guideData;
    }

    // Fetch tour details if tour_id exists
    let tour = null;
    if (booking.tour_id) {
      const { data: tourData } = await supabase
        .from('tours_table_prod')
        .select('id, title')
        .eq('id', booking.tour_id)
        .single();
      tour = tourData;
    }

    // Check if booking is already confirmed - confirmed means status is 'confirmed' AND has guides assigned
    if (booking.status === 'confirmed' && currentGuideIds.length > 0) {
      return NextResponse.json(
        { error: 'This assignment has already been confirmed and is no longer accessible.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        deal_id: booking.deal_id,
        guide_id: urlGuideId || (currentGuideIds.length > 0 ? currentGuideIds[0] : null), // Use guide_id from URL if provided
        tour_id: booking.tour_id,
        city: booking.city,
        tour_datetime: booking.tour_datetime,
        tour_end: booking.tour_end,
        status: booking.status,
        guide,
        tour,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

