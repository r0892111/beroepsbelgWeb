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
      // Continue with default if tour not found
    }

    // Calculate actual duration: use tour's duration_minutes, add 60 if extra hour is selected
    const baseDuration = tour?.duration_minutes || 120; // Default to 120 if not specified
    const extraHour = opMaatAnswers?.extraHour === true;
    const actualDuration = extraHour ? baseDuration + 60 : baseDuration;
    
    // Use provided durationMinutes if available (from frontend), otherwise use calculated duration
    const finalDurationMinutes = durationMinutes || actualDuration;
    

    // Format tour_datetime - convert dateTime to ISO string if provided
    // IMPORTANT: Treat the date/time as Brussels local time (Europe/Brussels timezone)
    // and convert it to UTC for storage
    let tourDatetime: string | null = null;
    if (dateTime) {
      try {
        // If dateTime is already an ISO string with timezone, use it directly
        // Otherwise, treat it as Brussels local time
        let dateObj: Date;
        if (typeof dateTime === 'string' && (dateTime.includes('+') || dateTime.includes('Z'))) {
          // Already has timezone info
          dateObj = new Date(dateTime);
        } else {
          // Treat as Brussels local time
          const dateTimeStr = typeof dateTime === 'string' ? dateTime : dateTime.toString();
          // Determine if it's DST (rough approximation: April-September)
          const monthMatch = dateTimeStr.match(/(\d{4})-(\d{2})/);
          const month = monthMatch ? parseInt(monthMatch[2], 10) : new Date().getMonth() + 1;
          const isDST = month >= 4 && month <= 9;
          const timezoneOffset = isDST ? '+02:00' : '+01:00';
          
          // Ensure format is yyyy-MM-ddTHH:mm:ss
          let formattedDateTime = dateTimeStr;
          if (formattedDateTime.includes('T')) {
            const [datePart, timePart] = formattedDateTime.split('T');
            if (timePart && timePart.split(':').length === 2) {
              formattedDateTime = `${datePart}T${timePart}:00`;
            }
          }
          
          dateObj = new Date(`${formattedDateTime}${timezoneOffset}`);
        }
        
        if (!isNaN(dateObj.getTime())) {
          tourDatetime = dateObj.toISOString();
        }
      } catch (e) {
        // Ignore parsing errors
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
      }
    }

    console.log('Tour timing calculation:', {
      tourDatetime,
      tourEndDatetime,
      finalDurationMinutes,
      baseDuration,
      extraHour,
    });

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
      isContacted: false,
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
      tour_end: tourEndDatetime, // End time (start + duration)
      city: citySlug || null,
      booking_type: 'B2B', // Mark as B2B booking (will be ignored if column doesn't exist)
      invitees: invitees,
    };

    console.log('Booking data to insert:', {
      tour_id: bookingData.tour_id,
      tour_datetime: bookingData.tour_datetime,
      tour_end: bookingData.tour_end,
      city: bookingData.city,
      status: bookingData.status,
      booking_type: bookingData.booking_type,
    });

    // Insert booking into tourbooking table
    // Try with booking_type first, if it fails due to missing column, retry without it
    let { data: createdBooking, error: bookingError } = await supabase
      .from('tourbooking')
      .insert(bookingData)
      .select('id, invitees, tour_datetime, tour_end')
      .single();

    // If error is due to missing booking_type column, retry without it
    if (bookingError && (bookingError.message?.includes('booking_type') || bookingError.message?.includes('column') || bookingError.code === '42703')) {
      console.log('Retrying without booking_type column...');
      const { booking_type, ...bookingDataWithoutType } = bookingData;
      const retryResult = await supabase
        .from('tourbooking')
        .insert(bookingDataWithoutType)
        .select('id, invitees, tour_datetime, tour_end')
        .single();
      
      createdBooking = retryResult.data;
      bookingError = retryResult.error;
    }

    if (createdBooking) {
      console.log('Booking created successfully:', {
        id: createdBooking.id,
        tour_datetime: createdBooking.tour_datetime,
        tour_end: createdBooking.tour_end,
      });
    }

    if (bookingError) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    if (!createdBooking?.id) {
      return NextResponse.json(
        { error: 'Booking created but no ID returned' },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      bookingId: createdBooking.id,
      status: 'quote_pending',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

