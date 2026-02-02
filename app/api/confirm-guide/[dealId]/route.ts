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

    // Parse booking ID - can be a number (like 551) or UUID format
    const bookingIdNum = parseInt(dealId, 10);
    const isNumericId = !isNaN(bookingIdNum);

    // Fetch the booking by booking id (numeric ID)
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id, tour_id, city, tour_datetime, tour_end, status')
      .eq('id', isNumericId ? bookingIdNum : dealId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Fetch guide details if guide_id exists
    let guide = null;
    if (booking.guide_id) {
      const { data: guideData } = await supabase
        .from('guides_temp')
        .select('id, name, Email, phonenumber')
        .eq('id', booking.guide_id)
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

    // Check if booking is already confirmed - confirmed means status is 'confirmed' AND guide_id is not null
    if (booking.status === 'confirmed' && booking.guide_id !== null) {
      return NextResponse.json(
        { error: 'This assignment has already been confirmed and is no longer accessible.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        deal_id: booking.deal_id,
        guide_id: booking.guide_id,
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

