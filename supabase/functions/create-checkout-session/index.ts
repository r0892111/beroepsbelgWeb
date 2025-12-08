import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      tourId,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      bookingTime,
      numberOfPeople,
      language,
      specialRequests,
      requestTanguy = false,
      userId,
      bookingType = 'B2C', // Default to B2C for consumer bookings
    } = await req.json()

    const { data: tour, error: tourError } = await supabase
      .from('tours_table_prod')
      .select('*')
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      throw new Error('Tour not found')
    }

    if (!tour.price) {
      throw new Error('Tour price not available')
    }

    const amount = Math.round(tour.price * numberOfPeople * 100)
    const tourTitle = tour.title_nl || tour.title_en || 'Tour'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: tourTitle,
              description: `${numberOfPeople} person(s) - ${bookingDate}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking/cancelled`,
      customer_email: customerEmail,
      metadata: {
        tourId,
        customerName,
        customerPhone: customerPhone || '',
        bookingDate,
        bookingTime: bookingTime || '',
        numberOfPeople: numberOfPeople.toString(),
        language,
        specialRequests: specialRequests || '',
        requestTanguy: requestTanguy.toString(),
        userId: userId || '',
      },
    })

    // Try to insert with booking_type, fall back without if column doesn't exist
    let bookingError;
    const bookingData = {
      tour_id: tourId,
      stripe_session_id: session.id,
      status: 'pending',
      tour_datetime: new Date(bookingDate).toISOString(),
      city: tour.city || null,
      request_tanguy: requestTanguy,
      invitees: [{
        name: customerName,
        email: customerEmail,
        phone: customerPhone || null,
        numberOfPeople,
        language,
        specialRequests: specialRequests || null,
        requestTanguy: requestTanguy,
        amount: tour.price * numberOfPeople,
        currency: 'eur',
      }],
    };

    // Try with booking_type first
    const result1 = await supabase.from('tourbooking').insert({
      ...bookingData,
      booking_type: bookingType,
    });

    if (result1.error) {
      console.error('Error with booking_type, trying without:', result1.error);
      // Try without booking_type in case column doesn't exist
      const result2 = await supabase.from('tourbooking').insert(bookingData);
      bookingError = result2.error;
    }

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})