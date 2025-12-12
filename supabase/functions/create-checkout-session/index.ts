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
      citySlug,
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

    // Prepare booking data based on actual table schema
    const bookingData: any = {
      tour_id: tourId,
      stripe_session_id: session.id,
      status: 'pending',
      tour_datetime: new Date(bookingDate).toISOString(),
      city: citySlug || tour.city || null,
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

    // Add user_id if provided (for logged-in users)
    if (userId) {
      bookingData.user_id = userId;
    }

    // Check if this is a local stories tour (local_stories = true)
    const isLocalStoriesTour = tour.local_stories === true;
    let existingLocalBooking: any = null;
    let saturdayDateStr: string = '';
    
    if (isLocalStoriesTour && bookingDate) {
      // For local stories tours, check if local_tours_booking exists for this Saturday
      const bookingDateObj = new Date(bookingDate);
      saturdayDateStr = bookingDateObj.toISOString().split('T')[0];
      
      const { data: localBooking, error: localBookingError } = await supabase
        .from('local_tours_bookings')
        .select('*')
        .eq('tour_id', tourId)
        .eq('booking_date', saturdayDateStr)
        .single();
      
      if (localBookingError && localBookingError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking local tours booking:', localBookingError);
      } else {
        existingLocalBooking = localBooking;
      }
    }

    // Insert booking into tourbooking table FIRST to get the booking ID
    const { data: createdBooking, error: bookingError } = await supabase
      .from('tourbooking')
      .insert(bookingData)
      .select('id')
      .single();

    console.log('Tourbooking creation result:', {
      createdBooking,
      bookingError,
      hasBookingId: !!createdBooking?.id,
      bookingId: createdBooking?.id,
    });

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
    } else if (createdBooking?.id) {
      console.log('Booking created successfully, ID:', createdBooking.id);
      
      // Check if this is a local stories tour
      if (isLocalStoriesTour && bookingDate) {
        console.log('Processing local stories booking:', {
          isLocalStoriesTour,
          bookingDate,
          saturdayDateStr,
          hasExistingLocalBooking: !!existingLocalBooking,
        });
        
        // Now update or create local_tours_bookings entry with the booking_id
        const localToursBookingData: any = {
          tour_id: tourId,
          booking_date: saturdayDateStr,
          booking_time: '14:00:00',
          is_booked: true,
          status: 'booked',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          stripe_session_id: session.id,
          booking_id: createdBooking.id, // Link to the tourbooking entry
        };
        
        if (userId) {
          localToursBookingData.user_id = userId;
        }
        
        console.log('Local stories booking - updating with booking_id:', {
          exists: !!existingLocalBooking,
          existingId: existingLocalBooking?.id,
          bookingId: createdBooking.id,
          bookingData: localToursBookingData,
        });
        
        let localToursBookingId: string | null = null;
        
        if (existingLocalBooking) {
          // Update existing booking with booking_id reference
          const { data: updatedBooking, error: updateError } = await supabase
            .from('local_tours_bookings')
            .update(localToursBookingData)
            .eq('id', existingLocalBooking.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating local tours booking:', updateError);
            console.error('Update error details:', JSON.stringify(updateError, null, 2));
          } else {
            localToursBookingId = updatedBooking.id;
            console.log('Successfully updated local tours booking with booking_id:', updatedBooking);
            console.log('Updated booking_id value:', updatedBooking?.booking_id);
            console.log('Local tours booking ID:', localToursBookingId);
          }
        } else {
          // Create new booking if it doesn't exist (shouldn't happen normally, but handle it)
          const { data: newBooking, error: insertError } = await supabase
            .from('local_tours_bookings')
            .insert(localToursBookingData)
            .select()
            .single();
          
          if (insertError) {
            console.error('Error creating local tours booking:', insertError);
            console.error('Insert error details:', JSON.stringify(insertError, null, 2));
          } else {
            localToursBookingId = newBooking.id;
            console.log('Successfully created local tours booking with booking_id:', newBooking);
            console.log('Created booking_id value:', newBooking?.booking_id);
            console.log('Local tours booking ID:', localToursBookingId);
          }
        }
        
        // Now update tourbooking to link back to local_tours_bookings
        if (localToursBookingId) {
          const { data: updatedTourBooking, error: updateTourBookingError } = await supabase
            .from('tourbooking')
            .update({ local_tours_booking_id: localToursBookingId })
            .eq('id', createdBooking.id)
            .select()
            .single();
          
          if (updateTourBookingError) {
            console.error('Error updating tourbooking with local_tours_booking_id:', updateTourBookingError);
            console.error('Update tourbooking error details:', JSON.stringify(updateTourBookingError, null, 2));
          } else {
            console.log('Successfully linked tourbooking to local_tours_bookings:', {
              tourbookingId: createdBooking.id,
              localToursBookingId: localToursBookingId,
              updatedTourBooking,
            });
          }
        }
      } else {
        console.log('Not a local stories tour or missing bookingDate:', {
          isLocalStoriesTour,
          bookingDate,
        });
      }
    } else {
      console.error('No booking ID returned from tourbooking insert');
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