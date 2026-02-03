import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toBrusselsLocalISO, addMinutesBrussels } from '@/lib/utils/timezone';

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
      contactLanguage, // Language for email communications (nl, en, fr, de)
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
      requestTanguy = false,
      weekendFee = false, // Weekend fee flag (€25 if Saturday/Sunday, except local_stories)
      eveningFee = false, // Evening fee flag (€25 for op_maat tours if time >= 17:00)
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
    

    // Format tour_datetime - convert dateTime to Brussels timezone ISO string WITHOUT timezone offset
    // Use centralized timezone utility for proper DST handling
    let tourDatetime: string | null = null;
    if (dateTime) {
      try {
        const dateObj = new Date(dateTime);
        if (!isNaN(dateObj.getTime())) {
          tourDatetime = toBrusselsLocalISO(dateObj);
        }
      } catch (e) {
        console.error('Error parsing dateTime:', e);
      }
    }

    // Calculate tour end datetime based on start time and duration
    let tourEndDatetime: string | null = null;
    if (tourDatetime) {
      try {
        tourEndDatetime = addMinutesBrussels(tourDatetime, finalDurationMinutes);
      } catch (e) {
        console.error('Error calculating tour end:', e);
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
      contactLanguage: contactLanguage || 'nl', // Language for email communications
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
      // Tanguy request
      requestTanguy: requestTanguy,
      // Weekend and evening fees
      weekendFeeCost: weekendFee ? 25 : 0,
      eveningFeeCost: eveningFee ? 25 : 0,
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

