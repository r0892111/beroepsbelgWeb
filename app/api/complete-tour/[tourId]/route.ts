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

async function getTourBookingById(bookingId: string) {
  const bookingIdNum = parseInt(bookingId, 10);
  
  if (isNaN(bookingIdNum)) {
    return null;
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('tourbooking')
    .select('id, tour_id, city, tour_datetime, status, picturesUploaded')
    .eq('id', bookingIdNum)
    .single();

  if (error || !data) {
    return null;
  }

  // Also fetch the tour details if tour_id exists
  let tour = null;
  if (data.tour_id) {
    const { data: tourData } = await supabase
      .from('tours_table_prod')
      .select('id, title')
      .eq('id', data.tour_id)
      .single();
    tour = tourData;
  }

  return {
    ...data,
    tour,
  };
}

async function triggerWebhook(bookingId: string) {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf11', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;
  
  const booking = await getTourBookingById(tourId);

  if (!booking) {
    return NextResponse.json(
      { error: 'Booking not found' },
      { status: 404 }
    );
  }

  // Only trigger webhook if tour is not already completed
  let webhookSuccess = false;
  if (booking.status !== 'completed') {
    webhookSuccess = await triggerWebhook(tourId);
  } else {
    webhookSuccess = true; // Already completed
  }

  return NextResponse.json({
    booking,
    webhookSuccess,
  });
}

