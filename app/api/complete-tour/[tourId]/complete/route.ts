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
    console.error('Error triggering webhook:', error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;
    const bookingIdNum = parseInt(tourId, 10);

    if (isNaN(bookingIdNum)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Check if booking exists and get current status and picturesUploaded flag
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, status, picturesUploaded')
      .eq('id', bookingIdNum)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Tour is already completed' },
        { status: 400 }
      );
    }

    // Check if pictures have been uploaded before allowing completion
    if (!booking.picturesUploaded) {
      return NextResponse.json(
        { error: 'Please upload tour photos before completing the tour' },
        { status: 400 }
      );
    }

    // Trigger webhook
    const webhookSuccess = await triggerWebhook(tourId);

    if (!webhookSuccess) {
      return NextResponse.json(
        { error: 'Failed to trigger webhook' },
        { status: 500 }
      );
    }

    // Update booking status to completed (or whatever status indicates completion)
    // You may want to adjust this based on your status values
    const { error: updateError } = await supabase
      .from('tourbooking')
      .update({ 
        status: 'completed',
        picturesUploaded: true // Also mark that photos are uploaded/finalized
      })
      .eq('id', bookingIdNum);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      // Still return success if webhook worked
    }

    return NextResponse.json({
      success: true,
      message: 'Tour completed successfully',
    });
  } catch (error) {
    console.error('Error completing tour:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

