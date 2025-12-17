import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req: Request) => {
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
      opMaat = false,
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

    const finalNumberOfPeople = opMaat ? 1 : numberOfPeople;
    const amount = Math.round(tour.price * finalNumberOfPeople * 100)
    const tourTitle = tour.title_nl || tour.title_en || 'Tour'
    // For op_maat tours, bookingDate is empty, so don't include it in description
    const description = opMaat 
      ? 'Op Maat Tour' 
      : `${finalNumberOfPeople} person(s) - ${bookingDate && bookingDate.trim() ? bookingDate : 'Date to be determined'}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: tourTitle,
              description: description,
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
        bookingDate: opMaat ? '' : (bookingDate || ''),
        bookingTime: opMaat ? '' : (bookingTime || ''),
        numberOfPeople: numberOfPeople.toString(),
        language,
        specialRequests: specialRequests || '',
        requestTanguy: requestTanguy.toString(),
        userId: userId || '',
        opMaat: opMaat.toString(),
      },
    })

    // Prepare booking data based on actual table schema
    const bookingData: any = {
      tour_id: tourId,
      stripe_session_id: session.id,
      status: 'pending',
      tour_datetime: opMaat ? null : (bookingDate && bookingDate.trim() ? new Date(bookingDate).toISOString() : null),
      city: citySlug || tour.city || null,
      request_tanguy: requestTanguy,
      invitees: [{
        name: customerName,
        email: customerEmail,
        phone: customerPhone || null,
        numberOfPeople: opMaat ? 1 : numberOfPeople,
        language: opMaat ? 'nl' : language,
        specialRequests: opMaat ? null : (specialRequests || null),
        requestTanguy: requestTanguy,
        amount: opMaat ? tour.price : (tour.price * numberOfPeople),
        currency: 'eur',
      }],
    };

    // Add user_id if provided (for logged-in users)
    if (userId) {
      bookingData.user_id = userId;
    }

    // Check if this is a local stories tour (local_stories = true)
    const isLocalStoriesTour = tour.local_stories === true;
    let saturdayDateStr: string = '';
    
    if (isLocalStoriesTour && bookingDate && bookingDate.trim()) {
      // For local stories tours, format the Saturday date
      const bookingDateObj = new Date(bookingDate);
      // Validate the date is valid before using it
      if (!isNaN(bookingDateObj.getTime())) {
        saturdayDateStr = bookingDateObj.toISOString().split('T')[0];
      }
    }

    // For local stories tours, check if there's an existing tourbooking for this customer/tour
    let existingBooking: any = null;
    if (isLocalStoriesTour) {
      // Build query to find existing booking
      let query = supabase
        .from('tourbooking')
        .select('id, tour_id, invitees')
        .eq('tour_id', tourId)
        .neq('status', 'cancelled'); // Don't reuse cancelled bookings
      
      // Match by user_id if logged in, otherwise by email in invitees
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      
      const { data: bookings, error: findError } = await query;
      
      if (!findError && bookings && bookings.length > 0) {
        // If no userId, check if any booking has matching email in invitees
        if (!userId) {
          const matchingBooking = bookings.find((b: any) => {
            if (b.invitees && Array.isArray(b.invitees)) {
              return b.invitees.some((inv: any) => inv.email === customerEmail);
            }
            return false;
          });
          if (matchingBooking) {
            existingBooking = matchingBooking;
          }
        } else {
          // For logged-in users, use the first matching booking
          existingBooking = bookings[0];
        }
      }
      
      console.log('Local stories - checking for existing booking:', {
        userId,
        customerEmail,
        found: !!existingBooking,
        existingBookingId: existingBooking?.id,
      });
    }

    let createdBooking: any = null;
    let bookingError: any = null;
    let localToursBooking: any = null; // Store local stories booking for response

    if (existingBooking) {
      // Reuse existing booking
      console.log('Reusing existing tourbooking:', existingBooking.id);
      
      // Update the existing booking with new invitee info (only if not already present)
      const updatedInvitees = existingBooking.invitees || [];
      const existingInviteeIndex = updatedInvitees.findIndex(
        (inv: any) => inv.email === customerEmail
      );
      
      if (existingInviteeIndex >= 0) {
        // Update existing invitee info
        updatedInvitees[existingInviteeIndex] = {
          ...updatedInvitees[existingInviteeIndex],
          name: customerName,
          email: customerEmail, // Ensure email is included
          phone: customerPhone || updatedInvitees[existingInviteeIndex].phone || null,
          numberOfPeople: numberOfPeople,
          language: language,
          specialRequests: specialRequests || updatedInvitees[existingInviteeIndex].specialRequests || null,
          requestTanguy: requestTanguy,
          amount: tour.price * numberOfPeople,
          currency: 'eur',
        };
      } else {
        // Add new invitee
        updatedInvitees.push({
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
          numberOfPeople,
          language,
          specialRequests: specialRequests || null,
          requestTanguy: requestTanguy,
          amount: tour.price * numberOfPeople,
          currency: 'eur',
        });
      }
      
      const { data: updatedBooking, error: updateError } = await supabase
        .from('tourbooking')
        .update({
          invitees: updatedInvitees,
          stripe_session_id: session.id, // Update with latest session
        })
        .eq('id', existingBooking.id)
        .select('id, tour_id')
        .single();
      
      if (updateError) {
        console.error('Error updating existing booking:', updateError);
        bookingError = updateError;
      } else {
        createdBooking = updatedBooking;
        console.log('Successfully updated existing booking:', createdBooking.id);
      }
    } else {
      // Create new booking
        const { data: newBooking, error: insertError } = await supabase
        .from('tourbooking')
        .insert(bookingData)
        .select('id, tour_id')
        .single();
      
      createdBooking = newBooking;
      bookingError = insertError;
      
      console.log('Tourbooking creation result:', {
        createdBooking,
        bookingError,
        hasBookingId: !!createdBooking?.id,
        bookingId: createdBooking?.id,
      });
    }

    if (bookingError) {
      console.error('Error creating/updating booking:', bookingError)
    } else if (createdBooking?.id) {
      console.log('Booking ready, ID:', createdBooking.id);
      
      // Check if this is a local stories tour
      if (isLocalStoriesTour && bookingDate && bookingDate.trim()) {
        console.log('Processing local stories booking:', {
          isLocalStoriesTour,
          bookingDate,
          saturdayDateStr,
          bookingId: createdBooking.id,
        });
        
        // Always create a new local_tours_bookings entry (one-to-many: multiple bookings per Saturday)
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
          booking_id: createdBooking.id, // Link to the tourbooking entry (many-to-one)
          amnt_of_people: numberOfPeople, // Store as numeric
        };
        
        if (userId) {
          localToursBookingData.user_id = userId;
        }
        
        console.log('Local stories booking - creating new entry:', {
          bookingId: createdBooking.id,
          bookingData: localToursBookingData,
        });
        
        // Create new local_tours_bookings entry
        const { data: newLocalBooking, error: insertError } = await supabase
          .from('local_tours_bookings')
          .insert(localToursBookingData)
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating local tours booking:', insertError);
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        } else {
          localToursBooking = newLocalBooking; // Store for response
          console.log('Successfully created local tours booking:', {
            localToursBookingId: newLocalBooking.id,
            bookingId: newLocalBooking.booking_id,
            tourId: newLocalBooking.tour_id,
            bookingDate: newLocalBooking.booking_date,
          });
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

    // Prepare response data
    const responseData: any = {
      sessionId: session.id,
      url: session.url,
    };
    
    // Include local stories booking if it was created
    if (localToursBooking) {
      responseData.localToursBooking = {
        id: localToursBooking.id,
        bookingId: localToursBooking.booking_id,
        tourId: localToursBooking.tour_id,
        bookingDate: localToursBooking.booking_date,
        bookingTime: localToursBooking.booking_time,
        amntOfPeople: localToursBooking.amnt_of_people,
        status: localToursBooking.status,
        customerEmail: localToursBooking.customer_email || customerEmail,
      };
    }

    return new Response(
      JSON.stringify(responseData),
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