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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    const {
      tourId,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      bookingTime,
      bookingDateTime, // Combined date and time in ISO format (yyyy-MM-ddTHH:mm)
      numberOfPeople,
      language,
      specialRequests,
      requestTanguy = false,
      userId,
      citySlug,
      opMaat = false,
      upsellProducts = [], // Array of { n: name, p: price, q: quantity } (standardized format)
    opMaatAnswers = null, // Op maat specific answers
    existingTourBookingId = null, // Existing tourbooking ID (for local stories - passed from frontend)
    durationMinutes = null, // Tour duration in minutes (will be calculated from tour data + extra hour)
    extraHour = false, // Extra hour option (150 EUR)
    locale = 'nl', // Locale for redirect URLs
    } = await req.json()

    // Freight costs constants
    const FREIGHT_COST_BE = 7.50;
    const FREIGHT_COST_INTERNATIONAL = 14.99;
    const FREIGHT_COST_FREE = 0; // Free for tour bookings with upsell products
    const TANGUY_COST = 125; // Tanguy button cost
    const EXTRA_HOUR_COST = 150; // Extra hour cost

    // Log received booking data for debugging
    console.log('Received booking data:', {
      bookingDate,
      bookingTime,
      bookingDateTime,
      opMaat,
      upsellProductsCount: upsellProducts.length,
      upsellProducts: upsellProducts,
    })

    const { data: tour, error: tourError } = await supabase
      .from('tours_table_prod')
      .select('*')
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      throw new Error('Tour not found')
    }

    // Calculate actual duration: use tour's duration_minutes, add 60 if extra hour is selected
    const baseDuration = tour.duration_minutes || 120; // Default to 120 if not specified
    const hasExtraHour = opMaatAnswers?.extraHour === true || extraHour === true;
    const actualDuration = hasExtraHour ? baseDuration + 60 : baseDuration;
    
    // Use provided durationMinutes if available (from frontend), otherwise use calculated duration
    const finalDurationMinutes = durationMinutes || actualDuration;
    
    console.log('Tour duration calculation:', {
      baseDuration,
      hasExtraHour,
      actualDuration,
      providedDurationMinutes: durationMinutes,
      finalDurationMinutes,
    });

    if (!tour.price) {
      throw new Error('Tour price not available')
    }

    const finalNumberOfPeople = numberOfPeople; // Use actual number of people for all tour types
    // Calculate discount for online bookings (10% discount, applies to tours only, not upsell products)
    const discountRate = 0.9; // 10% discount = 90% of original price
    const discountedPrice = tour.price * discountRate;
    const tourTitle = tour.title_nl || tour.title_en || 'Tour'
    // For op_maat tours, bookingDate is empty, so don't include it in description
    const description = opMaat 
      ? 'Op Maat Tour' 
      : `${finalNumberOfPeople} person(s) - ${bookingDate && bookingDate.trim() ? bookingDate : 'Date to be determined'}`;

    // Calculate tour amounts
    const tourFullPrice = tour.price * finalNumberOfPeople;
    const discountAmount = tourFullPrice * 0.1; // 10% discount on tour only
    const tourFinalAmount = tourFullPrice - discountAmount;
    const amount = Math.round(tourFinalAmount * 100); // Use discounted price
    
    // Build line items: tour (with discount applied) + upsell products
    // Tour line item: use discounted price, discount info will be in description and metadata
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: tourTitle,
            description: `${description} (10% online discount applied)`,
          },
          unit_amount: amount, // Discounted price for all people
        },
        quantity: 1, // Quantity is 1 because unit_amount already includes the total for all people
      },
    ];
    
    console.log('Tour line item added:', {
      name: tourTitle,
      description: description,
      unit_amount: amount,
      unit_amount_euros: (amount / 100).toFixed(2),
      quantity: 1,
      numberOfPeople: finalNumberOfPeople,
      originalPrice: tour.price,
      discountedPrice: discountedPrice,
      discountApplied: '10%',
      calculated_total: tourFinalAmount,
      original_total: tourFullPrice,
      savings: discountAmount,
    });

    // Add upsell products as line items (standardized format: {n: name, p: price, q: quantity})
    if (upsellProducts && Array.isArray(upsellProducts) && upsellProducts.length > 0) {
      console.log('Processing upsell products:', {
        count: upsellProducts.length,
        products: upsellProducts.map((p: any) => ({ 
          name: p.n || p.title || 'Product', 
          price: p.p || p.price || 0, 
          quantity: p.q || p.quantity || 1 
        }))
      });

      // Use standardized format: {n: name, p: price, q: quantity}
      // Support both new format (n, p, q) and legacy format (title, price, quantity) for backward compatibility
      for (const upsell of upsellProducts) {
        // Extract values from standardized format or legacy format
        const name = upsell.n || upsell.title || 'Product';
        const price = upsell.p !== undefined ? upsell.p : (upsell.price || 0);
        const quantity = upsell.q !== undefined ? upsell.q : (upsell.quantity || 1);

        if (price > 0 && quantity > 0) {
          const lineItem = {
            price_data: {
              currency: 'eur',
              product_data: {
                name: name,
              },
              unit_amount: Math.round(price * 100), // Convert to cents
            },
            quantity: quantity,
          };
          lineItems.push(lineItem);
          console.log('Added upsell product to line items:', {
            name: name,
            price: price,
            quantity: quantity,
            unit_amount: lineItem.price_data.unit_amount
          });
        } else {
          console.warn('Skipping upsell product due to invalid price or quantity:', {
            name: name,
            price: price,
            quantity: quantity
          });
        }
      }
    } else {
      console.log('No upsell products to add');
    }

    // Add Tanguy button cost (125 EUR) if requested
    if (requestTanguy) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Tanguy Button',
          },
          unit_amount: Math.round(TANGUY_COST * 100), // Convert to cents
        },
        quantity: 1,
      });
      console.log('Added Tanguy button to line items:', { cost: TANGUY_COST });
    }

    // Add extra hour cost (150 EUR) if selected
    if (hasExtraHour) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Extra Hour',
          },
          unit_amount: Math.round(EXTRA_HOUR_COST * 100), // Convert to cents
        },
        quantity: 1,
      });
      console.log('Added extra hour to line items:', { cost: EXTRA_HOUR_COST });
    }

    // Add shipping cost (FREE for tour bookings with upsell products)
    const hasUpsellProducts = upsellProducts && Array.isArray(upsellProducts) && upsellProducts.length > 0;
    
    if (hasUpsellProducts) {
      // Shipping is free, but we add it as a line item showing €0.00 for transparency
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Verzendkosten (GRATIS bij tourboeking)',
          },
          unit_amount: 0, // Free shipping
        },
        quantity: 1,
      });
      console.log('Added free shipping to line items (tour booking)');
    }

    console.log('=== CHECKOUT SESSION LINE ITEMS SUMMARY ===');
    console.log('Total line items:', lineItems.length);
    console.log('Line items breakdown:', lineItems.map((item: any, index: number) => ({
      index: index + 1,
      name: item.price_data.product_data.name,
      description: item.price_data.product_data.description || 'N/A',
      quantity: item.quantity,
      unit_amount_cents: item.price_data.unit_amount,
      unit_amount_euros: (item.price_data.unit_amount / 100).toFixed(2),
      line_total_euros: ((item.price_data.unit_amount * item.quantity) / 100).toFixed(2),
    })));
    
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
    console.log('Total checkout amount:', {
      cents: totalAmount,
      euros: (totalAmount / 100).toFixed(2),
      tourAmount: amount,
      tourAmountEuros: (amount / 100).toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      expected_amount: amount + (upsellProducts.reduce((sum: number, p: any) => {
        const qty = p.quantity || 1;
        const price = p.price || 0;
        return sum + (price * qty * 100);
      }, 0)),
    });
    console.log('===========================================');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true, // Enable discount/coupon code field
      success_url: `${req.headers.get('origin')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking/cancelled`,
      customer_email: customerEmail,
      metadata: {
        tourId,
        customerName,
        customerPhone: customerPhone || '',
        bookingDate: opMaat ? '' : (bookingDate || ''),
        bookingTime: opMaat ? '' : (bookingTime || ''),
        bookingDateTime: opMaat ? '' : (bookingDateTime || ''),
        numberOfPeople: numberOfPeople.toString(),
        language,
        specialRequests: specialRequests || '',
        requestTanguy: requestTanguy.toString(),
        userId: userId || '',
        opMaat: opMaat.toString(),
        // Store compact JSON format (standardized: {n, p, q}) to avoid exceeding 500 character limit
        // Full product details are stored in tourbooking.invitees[].upsellProducts JSONB column
        upsellProducts: upsellProducts.length > 0 
          ? JSON.stringify(
              upsellProducts.map((p: any) => ({
                n: ((p.n || p.title || '').substring(0, 40)), // name (truncated to 40 chars)
                p: (p.p !== undefined ? p.p : (p.price || 0)), // price
                q: (p.q !== undefined ? p.q : (p.quantity || 1)), // quantity
              }))
            )
          : '',
        upsellCount: upsellProducts.length.toString(),
        // Discount information for tracking (10% discount applies to tours only)
        tourOriginalPrice: tourFullPrice.toFixed(2),
        tourDiscountAmount: discountAmount.toFixed(2),
        tourDiscountPercent: '10%',
      },
    })

    // Prepare booking data based on actual table schema
    // Use combined bookingDateTime if available, otherwise fall back to combining date and time
    // IMPORTANT: For regular tours, date/time is REQUIRED. For op maat tours, save if provided.
    let tourDatetime: string | null = null;
    
    console.log('Processing tour datetime:', {
      opMaat,
      bookingDateTime,
      bookingDate,
      bookingTime,
      hasBookingDateTime: !!bookingDateTime,
      bookingDateTimeTrimmed: bookingDateTime?.trim(),
    });
    
    // Process date/time - try bookingDateTime first, then fall back to combining date and time
    // IMPORTANT: Treat the date/time as Brussels local time (Europe/Brussels timezone)
    // and convert it to UTC for storage
    if (bookingDateTime && bookingDateTime.trim()) {
      // Use the combined datetime string (format: yyyy-MM-ddTHH:mm)
      // Ensure it's properly formatted as ISO datetime with seconds
      const dateTimeStr = bookingDateTime.trim();
      // If time doesn't have seconds, add :00
      let formattedDateTime = dateTimeStr;
      if (dateTimeStr.includes('T')) {
        const [datePart, timePart] = dateTimeStr.split('T');
        if (timePart && timePart.split(':').length === 2) {
          // Time is HH:mm, add seconds
          formattedDateTime = `${datePart}T${timePart}:00`;
        }
      }
      
      // Parse as Brussels local time and convert to UTC
      // Format: "2025-01-15T14:00:00" should be treated as 14:00 Brussels time
      const [datePart, timePart] = formattedDateTime.split('T');
      if (datePart && timePart) {
        // Try to determine if it's DST (rough approximation: April-September)
        const month = parseInt(datePart.split('-')[1], 10);
        const isDST = month >= 4 && month <= 9;
        const timezoneOffset = isDST ? '+02:00' : '+01:00';
        const brusselsDateTimeWithTZ = `${formattedDateTime}${timezoneOffset}`;
        
        const dateObj = new Date(brusselsDateTimeWithTZ);
        if (!isNaN(dateObj.getTime())) {
          tourDatetime = dateObj.toISOString();
        } else {
          // Fallback: try without timezone (will use local server time, but better than nothing)
          const fallbackDate = new Date(formattedDateTime);
          if (!isNaN(fallbackDate.getTime())) {
            tourDatetime = fallbackDate.toISOString();
          }
        }
      }
    } else if (bookingDate && bookingDate.trim() && bookingTime && bookingTime.trim()) {
      // Fallback: combine date and time if bookingDateTime is not provided
      // Ensure time has seconds
      const timeWithSeconds = bookingTime.trim().split(':').length === 2 
        ? `${bookingTime.trim()}:00` 
        : bookingTime.trim();
      const combinedDateTime = `${bookingDate.trim()}T${timeWithSeconds}`;
      
      // Parse as Brussels local time and convert to UTC
      const month = parseInt(bookingDate.trim().split('-')[1], 10);
      const isDST = month >= 4 && month <= 9;
      const timezoneOffset = isDST ? '+02:00' : '+01:00';
      const brusselsDateTimeWithTZ = `${combinedDateTime}${timezoneOffset}`;
      
      const dateObj = new Date(brusselsDateTimeWithTZ);
      if (!isNaN(dateObj.getTime())) {
        tourDatetime = dateObj.toISOString();
      }
    } else {
      // No date/time provided
      if (opMaat) {
        // Op maat tours can proceed without a date (will be determined later)
        console.log('⚠ Op maat tour - no date/time provided (will be determined later)');
      } else {
        // Regular tours MUST have a date/time - this should not happen if form validation works
        console.error('✗ ERROR: Regular tour missing required date/time data:', { 
          bookingDate, 
          bookingTime, 
          bookingDateTime 
        });
        // Don't throw error here as booking can still proceed, but log it for debugging
      }
    }
    
    // Final validation: For regular tours, ensure we have a date/time
    if (!opMaat && !tourDatetime) {
      console.error('✗ CRITICAL: Regular tour proceeding without tour_datetime - this should not happen!');
    }

    // Calculate tour end datetime based on start time and duration
    let tourEndDatetime: string | null = null;
    if (tourDatetime) {
      const startDate = new Date(tourDatetime);
      if (!isNaN(startDate.getTime())) {
        // Add duration in minutes to start time
        const endDate = new Date(startDate.getTime() + finalDurationMinutes * 60 * 1000);
        tourEndDatetime = endDate.toISOString();
        console.log('Calculated tour end datetime:', {
          start: tourDatetime,
          durationMinutes: finalDurationMinutes,
          end: tourEndDatetime,
          extraHour: opMaatAnswers?.extraHour || false,
        });
      }
    }

    const bookingData: any = {
      tour_id: tourId,
      stripe_session_id: session.id,
      status: 'pending',
      tour_datetime: tourDatetime, // This will be null if no date provided, or ISO string if date is provided
      tour_end: tourEndDatetime, // End time (start + duration)
      city: citySlug || tour.city || null,
      request_tanguy: requestTanguy,
      invitees: [{
        name: customerName,
        email: customerEmail,
        phone: customerPhone || null,
        numberOfPeople: numberOfPeople,
        language: opMaat ? 'nl' : language,
        specialRequests: opMaat ? null : (specialRequests || null),
        requestTanguy: requestTanguy,
        // Store the DISCOUNTED tour amount (what the customer actually pays)
        // tourFinalAmount = tour.price * numberOfPeople * 0.9 (10% discount applied)
        amount: tourFinalAmount, // Discounted tour price (10% off)
        originalAmount: tour.price * numberOfPeople, // Original price for reference
        discountApplied: discountAmount, // Amount saved
        tanguyCost: requestTanguy ? TANGUY_COST : 0, // Tanguy button cost if selected
        extraHourCost: hasExtraHour ? EXTRA_HOUR_COST : 0, // Extra hour cost if selected
        currency: 'eur',
        upsellProducts: upsellProducts.length > 0 ? upsellProducts : undefined, // Store upsell products in invitee
        // Op maat specific answers
        opMaatAnswers: opMaatAnswers || null,
        // Tour timing information
        tourStartDatetime: tourDatetime, // Start time
        tourEndDatetime: tourEndDatetime, // End time (start + duration)
        durationMinutes: finalDurationMinutes, // Duration in minutes (base duration + 60 if extra hour)
      }],
    };
    
    console.log('Booking data to be saved:', {
      opMaat,
      tour_datetime: tourDatetime,
      tour_end: tourEndDatetime,
      hasTourDatetime: !!tourDatetime,
      hasTourEnd: !!tourEndDatetime,
      tour_datetime_formatted: tourDatetime ? new Date(tourDatetime).toISOString() : null,
      tour_end_formatted: tourEndDatetime ? new Date(tourEndDatetime).toISOString() : null,
      bookingDateTime,
      bookingDate,
      bookingTime,
      finalDurationMinutes,
      warning: !opMaat && !tourDatetime ? '⚠️ Regular tour without date/time!' : null,
      opMaatAnswers: opMaatAnswers ? {
        hasAnswers: true,
        startEnd: opMaatAnswers.startEnd ? '✓' : '✗',
        cityPart: opMaatAnswers.cityPart ? '✓' : '✗',
        subjects: opMaatAnswers.subjects ? '✓' : '✗',
        specialWishes: opMaatAnswers.specialWishes ? '✓' : '✗',
      } : null,
    });

    // Add user_id if provided (for logged-in users)
    if (userId) {
      bookingData.user_id = userId;
    }

    // Check if this is a local stories tour (local_stories = true)
    const isLocalStoriesTour = tour.local_stories === true;
    let existingTourBooking: any = null;
    let saturdayDateStr: string = '';
    let saturdayDateTime: string = '';
    
    if (isLocalStoriesTour && bookingDate) {
      // Use combined datetime if available, otherwise use bookingDate
      let dateToUse: string | null = null;
      if (bookingDateTime && bookingDateTime.trim()) {
        dateToUse = bookingDateTime.split('T')[0]; // Extract date part from combined datetime
      } else if (bookingDate && bookingDate.trim()) {
        dateToUse = bookingDate;
      }
      
      if (dateToUse) {
        // For local stories tours, format the Saturday date
        const bookingDateObj = new Date(dateToUse);
        // Validate the date is valid before using it
        if (!isNaN(bookingDateObj.getTime())) {
          saturdayDateStr = bookingDateObj.toISOString().split('T')[0];
          saturdayDateTime = `${saturdayDateStr}T14:00:00`; // Always 14:00 for local stories
        }
      }
      
      // ALWAYS check by date first (most reliable method for local stories)
      // This ensures we find existing tourbookings even if frontend doesn't have booking_id
      if (saturdayDateStr) {
        console.log('Looking for existing tourbooking for Saturday:', saturdayDateStr);
        
        const { data: existingBookings, error: existingBookingError } = await supabase
          .from('tourbooking')
          .select('id, invitees, tour_datetime')
          .eq('tour_id', tourId)
          .gte('tour_datetime', `${saturdayDateStr}T00:00:00`)
          .lt('tour_datetime', `${saturdayDateStr}T23:59:59`);
        
        if (existingBookingError) {
          console.error('Error checking existing tourbooking for local stories:', existingBookingError);
        } else if (existingBookings && existingBookings.length > 0) {
          // Found existing tourbooking for this Saturday - use the first one
          existingTourBooking = existingBookings[0];
          console.log('Found existing tourbooking for local stories Saturday (by date):', {
            tourbookingId: existingTourBooking.id,
            existingInviteesCount: existingTourBooking.invitees?.length || 0,
            saturdayDateStr,
          });
        } else {
          console.log('No existing tourbooking found for date, will create new one:', saturdayDateStr);
        }
      }
      
      // Fallback: If no tourbooking found by date but existingTourBookingId is passed, try that
      if (!existingTourBooking && existingTourBookingId) {
        console.log('No tourbooking found by date, trying existingTourBookingId:', existingTourBookingId);
        const { data: existingBooking, error: existingBookingError } = await supabase
          .from('tourbooking')
          .select('id, invitees, tour_datetime')
          .eq('id', existingTourBookingId)
          .eq('tour_id', tourId)
          .single();
        
        if (existingBookingError) {
          console.error('Error fetching existing tourbooking by ID:', existingBookingError);
        } else if (existingBooking) {
          existingTourBooking = existingBooking;
          console.log('Found existing tourbooking by ID:', {
            tourbookingId: existingTourBooking.id,
            existingInviteesCount: existingTourBooking.invitees?.length || 0,
            saturdayDateStr,
          });
        }
      }
    }

    // For local stories tours, use existing tourbooking or create new one
    let createdBooking: any = null;
    let bookingError: any = null;
    
    if (isLocalStoriesTour && existingTourBooking) {
      // Use existing tourbooking - update stripe_session_id so webhook can find it
      // We'll append the new invitee later in the local stories processing section
      const { data: updatedBooking, error: updateError } = await supabase
        .from('tourbooking')
        .update({ stripe_session_id: session.id })
        .eq('id', existingTourBooking.id)
        .select('id, invitees')
        .single();
      
      if (updateError) {
        console.error('Error updating stripe_session_id on existing tourbooking:', updateError);
        // Fall back to using existing booking without update
        createdBooking = existingTourBooking;
      } else {
        createdBooking = updatedBooking;
        console.log('Using existing tourbooking for local stories (stripe_session_id updated):', {
          tourbookingId: createdBooking.id,
          currentInviteesCount: createdBooking.invitees?.length || 0,
        });
      }
    } else {
      // Insert new booking into tourbooking table
      const result = await supabase
        .from('tourbooking')
        .insert(bookingData)
        .select('id, invitees')
        .single();
      
      createdBooking = result.data;
      bookingError = result.error;
    }

    // Verify opMaatAnswers were saved correctly (only for new bookings)
    const savedInvitees = createdBooking?.invitees || [];
    const savedOpMaatAnswers = savedInvitees[0]?.opMaatAnswers || null;

    console.log('Tourbooking creation result:', {
      createdBooking,
      bookingError,
      hasBookingId: !!createdBooking?.id,
      bookingId: createdBooking?.id,
      usingExistingTourBooking: !!existingTourBooking,
      opMaatAnswersSaved: !!savedOpMaatAnswers,
      savedOpMaatAnswers: savedOpMaatAnswers ? {
        startEnd: savedOpMaatAnswers.startEnd ? '✓' : '✗',
        cityPart: savedOpMaatAnswers.cityPart ? '✓' : '✗',
        subjects: savedOpMaatAnswers.subjects ? '✓' : '✗',
        specialWishes: savedOpMaatAnswers.specialWishes ? '✓' : '✗',
      } : null,
    });

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
    } else if (createdBooking?.id) {
      console.log('Booking created/retrieved successfully, ID:', createdBooking.id);
      
      // Check if this is a local stories tour
      if (isLocalStoriesTour && saturdayDateStr) {
        console.log('Processing local stories booking:', {
          isLocalStoriesTour,
          bookingDate,
          bookingDateTime,
          saturdayDateStr,
          saturdayDateTime,
          usingExistingTourBooking: !!existingTourBooking,
        });
        
        // Extract time from combined datetime if available, otherwise use bookingTime or default to 14:00
        let bookingTimeStr = '14:00:00';
        if (bookingDateTime && bookingDateTime.trim()) {
          const timePart = bookingDateTime.split('T')[1]; // Extract time part (HH:mm)
          if (timePart) {
            bookingTimeStr = `${timePart}:00`; // Add seconds
          }
        } else if (bookingTime && bookingTime.trim()) {
          bookingTimeStr = `${bookingTime}:00`; // Add seconds
        }
        
        // For local stories tours, always ensure the invitee is added to the tourbooking's invitees list
        const newInvitee = {
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
          numberOfPeople: numberOfPeople,
          language: opMaat ? 'nl' : language,
          specialRequests: opMaat ? null : (specialRequests || null),
          requestTanguy: requestTanguy,
          amount: tour.price * numberOfPeople,
          currency: 'eur',
          upsellProducts: upsellProducts.length > 0 ? upsellProducts : undefined,
          opMaatAnswers: opMaatAnswers || null,
        };
        
        if (existingTourBooking && createdBooking.id === existingTourBooking.id) {
          // Using existing tourbooking - append new invitee to existing invitees array
          // Use the current invitees from createdBooking (which was just fetched/updated)
          const currentInvitees = createdBooking.invitees || [];
          
          // Check if this invitee already exists (by email) to avoid duplicates
          const inviteeExists = currentInvitees.some((inv: any) => inv.email === customerEmail);
          
          if (!inviteeExists) {
            const updatedInvitees = [...currentInvitees, newInvitee];
            
            // Update tourbooking with new invitee added
            const { error: updateInviteesError } = await supabase
              .from('tourbooking')
              .update({ invitees: updatedInvitees })
              .eq('id', createdBooking.id);
            
            if (updateInviteesError) {
              console.error('Error updating invitees for existing tourbooking:', updateInviteesError);
            } else {
              console.log('Successfully added new invitee to existing tourbooking:', {
                tourbookingId: createdBooking.id,
                customerEmail,
                totalInvitees: updatedInvitees.length,
              });
            }
          } else {
            console.log('Invitee already exists in existing tourbooking, skipping duplicate add:', {
              tourbookingId: createdBooking.id,
              customerEmail,
              currentInviteesCount: currentInvitees.length,
            });
          }
        } else {
          // New tourbooking - ensure invitee is in the invitees array and tour_datetime is set correctly
          const currentInvitees = createdBooking?.invitees || [];
          // Check if this invitee already exists (by email) to avoid duplicates
          const inviteeExists = currentInvitees.some((inv: any) => inv.email === customerEmail);
          
          if (!inviteeExists) {
            // Add the invitee if it doesn't already exist
            const updatedInvitees = [...currentInvitees, newInvitee];
            
            const updateData: any = {
              invitees: updatedInvitees,
            };
            
            // Also set tour_datetime if we have it
            if (saturdayDateTime) {
              updateData.tour_datetime = saturdayDateTime;
            }
            
            const { error: updateError } = await supabase
              .from('tourbooking')
              .update(updateData)
              .eq('id', createdBooking.id);
            
            if (updateError) {
              console.error('Error updating invitees/tour_datetime for new local stories tourbooking:', updateError);
            } else {
              console.log('Successfully added invitee to new local stories tourbooking:', {
                tourbookingId: createdBooking.id,
                totalInvitees: updatedInvitees.length,
                tour_datetime: saturdayDateTime,
              });
            }
          } else {
            // Invitee already exists, just update tour_datetime if needed
            if (saturdayDateTime) {
              const { error: updateDateTimeError } = await supabase
                .from('tourbooking')
                .update({ tour_datetime: saturdayDateTime })
                .eq('id', createdBooking.id);
              
              if (updateDateTimeError) {
                console.error('Error updating tour_datetime for new local stories booking:', updateDateTimeError);
              }
            }
            console.log('Invitee already exists in tourbooking, skipping duplicate add:', {
              tourbookingId: createdBooking.id,
              customerEmail,
            });
          }
        }
        
        // Always create a new local_tours_bookings entry linking to the tourbooking
        const localToursBookingData: any = {
          tour_id: tourId,
          booking_date: saturdayDateStr,
          booking_time: bookingTimeStr,
          is_booked: true,
          status: 'booked',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          stripe_session_id: session.id, // Stripe checkout session ID for direct lookup
          booking_id: createdBooking.id, // Link to the tourbooking entry (same for all bookings on same Saturday)
          amnt_of_people: numberOfPeople, // Store the number of people for this specific booking
        };
        
        if (userId) {
          localToursBookingData.user_id = userId;
        }
        
        console.log('Creating local_tours_bookings entry:', {
          tourbookingId: createdBooking.id,
          bookingData: localToursBookingData,
        });
        
        // Create new local_tours_bookings entry (multiple entries can link to same tourbooking)
        const { data: newLocalBooking, error: insertError } = await supabase
          .from('local_tours_bookings')
          .insert(localToursBookingData)
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating local tours booking:', insertError);
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        } else {
          console.log('Successfully created local_tours_bookings entry:', {
            localToursBookingId: newLocalBooking.id,
            tourbookingId: createdBooking.id,
            bookingDate: saturdayDateStr,
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
