import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Fetch the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'payment_intent'],
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found in Stripe' },
        { status: 404 }
      );
    }

    // Check if payment was completed
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: `Payment status is ${session.payment_status}, not 'paid'` },
        { status: 400 }
      );
    }

    // Check if pending booking exists
    const { data: pendingBooking, error: pendingError } = await supabase
      .from('pending_tour_bookings')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (pendingError) {
      return NextResponse.json(
        { error: `Error fetching pending booking: ${pendingError.message}` },
        { status: 500 }
      );
    }

    if (!pendingBooking) {
      return NextResponse.json(
        { error: 'No pending booking found for this session' },
        { status: 404 }
      );
    }

    // Create a mock Stripe event
    const mockEvent: Stripe.Event = {
      id: `evt_manual_${Date.now()}`,
      object: 'event',
      api_version: '2024-12-18.acacia',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: session as any,
        previous_attributes: null,
      },
      livemode: session.livemode,
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: 'checkout.session.completed',
    };

    // Call the webhook Edge Function directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL not configured' },
        { status: 500 }
      );
    }
    
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        // Admin reprocess mode - bypasses signature verification
        'X-Admin-Reprocess': 'true',
      },
      body: JSON.stringify(mockEvent),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Webhook processing failed',
          details: responseData,
          status: response.status,
        },
        { status: 500 }
      );
    }

    // Check if booking was created
    const { data: createdBooking } = await supabase
      .from('tourbooking')
      .select('id, status')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: 'Booking reprocessed successfully',
      sessionId,
      pendingBookingId: pendingBooking.id,
      createdBookingId: createdBooking?.id || null,
      bookingStatus: createdBooking?.status || null,
      webhookResponse: responseData,
    });
  } catch (error: any) {
    console.error('Error reprocessing booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reprocess booking' },
      { status: 500 }
    );
  }
}
