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

// Parse dealId which is in format "uuid-guide_id"
function parseDealId(dealId: string): { uuid: string; guideId: number | null } {
  const parts = dealId.split('-');
  
  // UUID has 5 parts separated by hyphens, guide_id is appended after
  // Format: "123e4567-e89b-12d3-a456-426614174000-123"
  if (parts.length >= 6) {
    // Last part is guide_id
    const guideId = parseInt(parts[parts.length - 1], 10);
    // Everything except last part is UUID
    const uuid = parts.slice(0, -1).join('-');
    
    if (!isNaN(guideId)) {
      return { uuid, guideId };
    }
  }
  
  // Fallback: treat entire string as UUID (backward compatibility)
  return { uuid: dealId, guideId: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    if (!dealId) {
      return NextResponse.json(
        { error: 'Invalid deal ID' },
        { status: 400 }
      );
    }

    const { uuid, guideId } = parseDealId(dealId);
    const supabase = getSupabaseServer();

    // Fetch the booking by deal_id (using the UUID part)
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id, tour_id, city, tour_datetime, status')
      .eq('deal_id', uuid)
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

    return NextResponse.json({
      booking: {
        id: booking.id,
        deal_id: booking.deal_id,
        guide_id: guideId || booking.guide_id, // Use parsed guideId if available, otherwise use booking's guide_id
        tour_id: booking.tour_id,
        city: booking.city,
        tour_datetime: booking.tour_datetime,
        status: booking.status,
        guide,
        tour,
      },
    });
  } catch (error) {
    console.error('Error in confirm-guide API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

