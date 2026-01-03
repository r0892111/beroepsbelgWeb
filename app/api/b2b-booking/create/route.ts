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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await request.json();

    const {
      tourId,
      citySlug,
      dateTime,
      language,
      numberOfPeople,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      companyName,
      vatNumber,
      billingAddress,
      additionalInfo,
      upsellProducts = [],
      opMaatAnswers = null,
      durationMinutes = null, // Tour duration in minutes (will be calculated from tour data + extra hour)
    } = body;

    // Validate required fields
    if (!tourId || !contactEmail || !numberOfPeople) {
      return NextResponse.json(
        { error: 'Missing required fields: tourId, contactEmail, numberOfPeople' },
        { status: 400 }
      );
    }

    // Fetch tour data to get actual duration
    const { data: tour, error: tourError } = await supabase
      .from('tours_table_prod')
      .select('duration_minutes')
      .eq('id', tourId)
      .single();

    if (tourError || !tour) {
      console.error('Error fetching tour data:', tourError);
      // Continue with default if tour not found
    }

    // Calculate actual duration: use tour's duration_minutes, add 60 if extra hour is selected
    const baseDuration = tour?.duration_minutes || 120; // Default to 120 if not specified
    const extraHour = opMaatAnswers?.extraHour === true;
    const actualDuration = extraHour ? baseDuration + 60 : baseDuration;
    
    // Use provided durationMinutes if available (from frontend), otherwise use calculated duration
    const finalDurationMinutes = durationMinutes || actualDuration;
    
    console.log('Tour duration calculation for B2B booking:', {
      baseDuration,
      extraHour,
      actualDuration,
      providedDurationMinutes: durationMinutes,
      finalDurationMinutes,
    });

    // Format tour_datetime - convert dateTime to ISO string if provided
    let tourDatetime: string | null = null;
    if (dateTime) {
      try {
        const dateObj = new Date(dateTime);
        if (!isNaN(dateObj.getTime())) {
          tourDatetime = dateObj.toISOString();
        }
      } catch (e) {
        console.error('Error parsing dateTime:', e);
      }
    }

    // Calculate tour end datetime based on start time and duration
    let tourEndDatetime: string | null = null;
    if (tourDatetime) {
      const startDate = new Date(tourDatetime);
      if (!isNaN(startDate.getTime())) {
        // Add duration in minutes to start time
        const endDate = new Date(startDate.getTime() + finalDurationMinutes * 60 * 1000);
        tourEndDatetime = endDate.toISOString();
        console.log('Calculated tour end datetime for B2B booking:', {
          start: tourDatetime,
          durationMinutes: finalDurationMinutes,
          end: tourEndDatetime,
          extraHour: opMaatAnswers?.extraHour || false,
        });
      }
    }

    // Build invitees array similar to B2C flow
    const invitees = [{
      name: `${contactFirstName || ''} ${contactLastName || ''}`.trim() || contactEmail,
      email: contactEmail,
      phone: contactPhone || null,
      numberOfPeople: parseInt(numberOfPeople, 10) || 1,
      language: language || 'nl',
      specialRequests: additionalInfo || null,
      amount: 0, // B2B bookings don't have payment yet
      currency: 'eur',
      upsellProducts: upsellProducts.length > 0 ? upsellProducts : undefined,
      // B2B specific fields
      companyName: companyName || null,
      vatNumber: vatNumber || null,
      billingAddress: billingAddress || null,
      // Op maat specific answers
      opMaatAnswers: opMaatAnswers || null,
      // Tour timing information
      tourStartDatetime: tourDatetime, // Start time
      tourEndDatetime: tourEndDatetime, // End time (start + duration)
      durationMinutes: finalDurationMinutes, // Duration in minutes (base duration + 60 if extra hour)
    }];

    // Create booking data
    // Note: booking_type column may not exist if migration hasn't run yet
    // We'll try with it first, then retry without it if needed
    const bookingData: any = {
      tour_id: tourId,
      stripe_session_id: null, // B2B bookings don't have Stripe session initially
      status: 'quote_pending', // Quote status flow: quote_pending → quote_sent → quote_accepted → quote_paid → confirmed
      tour_datetime: tourDatetime,
      city: citySlug || null,
      booking_type: 'B2B', // Mark as B2B booking (will be ignored if column doesn't exist)
      invitees: invitees,
    };

    // Insert booking into tourbooking table
    // Try with booking_type first, if it fails due to missing column, retry without it
    let { data: createdBooking, error: bookingError } = await supabase
      .from('tourbooking')
      .insert(bookingData)
      .select('id, invitees')
      .single();

    // If error is due to missing booking_type column, retry without it
    if (bookingError && (bookingError.message?.includes('booking_type') || bookingError.message?.includes('column') || bookingError.code === '42703')) {
      console.warn('booking_type column not found, retrying without it');
      const { booking_type, ...bookingDataWithoutType } = bookingData;
      const retryResult = await supabase
        .from('tourbooking')
        .insert(bookingDataWithoutType)
        .select('id, invitees')
        .single();
      
      createdBooking = retryResult.data;
      bookingError = retryResult.error;
    }

    if (bookingError) {
      console.error('Error creating B2B booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    if (!createdBooking?.id) {
      return NextResponse.json(
        { error: 'Booking created but no ID returned' },
        { status: 500 }
      );
    }

    // Verify opMaatAnswers were saved correctly
    const savedInvitees = createdBooking?.invitees || [];
    const savedOpMaatAnswers = savedInvitees[0]?.opMaatAnswers || null;

    console.log('B2B booking created successfully:', {
      bookingId: createdBooking.id,
      tourId,
      status: 'quote_pending',
      hasOpMaatAnswers: !!opMaatAnswers,
      opMaatAnswersSaved: !!savedOpMaatAnswers,
      opMaatAnswers: opMaatAnswers ? {
        startEnd: opMaatAnswers.startEnd ? '✓' : '✗',
        cityPart: opMaatAnswers.cityPart ? '✓' : '✗',
        subjects: opMaatAnswers.subjects ? '✓' : '✗',
        specialWishes: opMaatAnswers.specialWishes ? '✓' : '✗',
      } : null,
      savedOpMaatAnswers: savedOpMaatAnswers ? {
        startEnd: savedOpMaatAnswers.startEnd ? '✓' : '✗',
        cityPart: savedOpMaatAnswers.cityPart ? '✓' : '✗',
        subjects: savedOpMaatAnswers.subjects ? '✓' : '✗',
        specialWishes: savedOpMaatAnswers.specialWishes ? '✓' : '✗',
      } : null,
    });

    return NextResponse.json({
      success: true,
      bookingId: createdBooking.id,
      status: 'quote_pending',
    });
  } catch (error: any) {
    console.error('Error in B2B booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

