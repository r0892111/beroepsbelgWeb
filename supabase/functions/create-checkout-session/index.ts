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
    weekendFee = false, // Weekend fee (25 EUR) - applies to all tour types
    eveningFee = false, // Evening fee (25 EUR) - only for op_maat tours when time >= 17:00
    } = await req.json()

    // Freight costs constants
    const FREIGHT_COST_BE = 7.50;
    const FREIGHT_COST_INTERNATIONAL = 14.99;
    const FREIGHT_COST_FREE = 0; // Free for tour bookings with upsell products
    const TANGUY_COST = 125; // Fee for Tanguy as personal guide
    const EXTRA_HOUR_COST = 150; // Extra hour cost
    const WEEKEND_FEE_COST = 25; // Weekend surcharge (Saturday/Sunday)
    const EVENING_FEE_COST = 25; // Evening surcharge (op_maat tours starting at 17:00 or later)

    // Log received booking data for debugging
    console.log('Received booking data:', {
      tourId,
      customerEmail,
      bookingDate,
      bookingTime,
      bookingDateTime,
      opMaat,
      existingTourBookingId,
      upsellProductsCount: upsellProducts.length,
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
    const tourTitle = tour.title_nl || tour.title_en || 'Tour'
    // For op_maat tours, bookingDate is empty, so don't include it in description
    const description = opMaat
      ? 'Op Maat Tour'
      : `${finalNumberOfPeople} person(s) - ${bookingDate && bookingDate.trim() ? bookingDate : 'Date to be determined'}`;

    // Calculate tour amounts (no discount)
    const tourFullPrice = tour.price * finalNumberOfPeople;
    const discountAmount = 0; // No discount currently applied
    const tourFinalAmount = tourFullPrice - discountAmount;
    const amount = Math.round(tourFinalAmount * 100);

    // Build line items: tour + upsell products
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: tourTitle,
            description: description,
          },
          unit_amount: amount,
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
      pricePerPerson: tour.price,
      calculated_total: tourFinalAmount,
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
            name: 'Een persoonlijke tour van Tanguy',
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

    // Add weekend fee (25 EUR) if booking is on Saturday or Sunday
    if (weekendFee) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Weekendtoeslag',
          },
          unit_amount: Math.round(WEEKEND_FEE_COST * 100), // Convert to cents
        },
        quantity: 1,
      });
      console.log('Added weekend fee to line items:', { cost: WEEKEND_FEE_COST });
    }

    // Add evening fee (25 EUR) for op_maat tours starting at 17:00 or later
    if (eveningFee) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Avondtoeslag',
          },
          unit_amount: Math.round(EVENING_FEE_COST * 100), // Convert to cents
        },
        quantity: 1,
      });
      console.log('Added evening fee to line items:', { cost: EVENING_FEE_COST });
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
      allow_promotion_codes: true, // Allow customers to enter promo codes
      success_url: `${req.headers.get('origin')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking/cancelled`,
      customer_email: customerEmail,
      metadata: {
        tourId,
        customerName,
        customerEmail,
      },
    })

    // Process tour datetime for the booking data
    let tourDatetime: string | null = null;

    console.log('Processing tour datetime:', {
      opMaat,
      bookingDateTime,
      bookingDate,
      bookingTime,
    });

    // Process date/time - try bookingDateTime first, then fall back to combining date and time
    if (bookingDateTime && bookingDateTime.trim()) {
      const dateTimeStr = bookingDateTime.trim();
      let formattedDateTime = dateTimeStr;
      if (dateTimeStr.includes('T')) {
        const [datePart, timePart] = dateTimeStr.split('T');
        if (timePart && timePart.split(':').length === 2) {
          formattedDateTime = `${datePart}T${timePart}:00`;
        }
      }
      const dateObj = new Date(formattedDateTime);
      if (!isNaN(dateObj.getTime())) {
        tourDatetime = dateObj.toISOString();
      }
    } else if (bookingDate && bookingDate.trim() && bookingTime && bookingTime.trim()) {
      const timeWithSeconds = bookingTime.trim().split(':').length === 2
        ? `${bookingTime.trim()}:00`
        : bookingTime.trim();
      const combinedDateTime = `${bookingDate.trim()}T${timeWithSeconds}`;
      const dateObj = new Date(combinedDateTime);
      if (!isNaN(dateObj.getTime())) {
        tourDatetime = dateObj.toISOString();
      }
    }

    // Calculate tour end datetime
    let tourEndDatetime: string | null = null;
    if (tourDatetime) {
      const startDate = new Date(tourDatetime);
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + finalDurationMinutes * 60 * 1000);
        tourEndDatetime = endDate.toISOString();
      }
    }

    // Determine tour type
    const isLocalStoriesTour = tour.local_stories === true;
    let tourType = 'standard';
    if (isLocalStoriesTour) {
      tourType = 'local_stories';
    } else if (opMaat) {
      tourType = 'op_maat';
    }

    // Extract Saturday date for local stories
    let saturdayDateStr = '';
    if (isLocalStoriesTour) {
      if (bookingDateTime && bookingDateTime.trim()) {
        saturdayDateStr = bookingDateTime.split('T')[0];
      } else if (bookingDate && bookingDate.trim()) {
        saturdayDateStr = bookingDate;
      }
    }

    // Build comprehensive booking data object for pending_tour_bookings
    const bookingData = {
      tourId,
      tourTitle: tourTitle,
      tourPrice: tour.price,
      isLocalStories: isLocalStoriesTour,
      isOpMaat: opMaat,

      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      userId: userId || null,

      bookingDate: opMaat ? null : (bookingDate || null),
      bookingTime: opMaat ? null : (bookingTime || null),
      bookingDateTime: opMaat ? null : (bookingDateTime || null),
      tourDatetime,
      tourEndDatetime,
      durationMinutes: finalDurationMinutes,
      saturdayDateStr: saturdayDateStr || null,

      numberOfPeople,
      language,
      specialRequests: specialRequests || null,
      requestTanguy,
      extraHour: hasExtraHour,

      citySlug: citySlug || tour.city || null,

      opMaatAnswers: opMaatAnswers || null,
      upsellProducts: upsellProducts.length > 0 ? upsellProducts : [],

      amounts: {
        tourFullPrice,
        discountAmount,
        tourFinalAmount,
        tanguyCost: requestTanguy ? TANGUY_COST : 0,
        extraHourCost: hasExtraHour ? EXTRA_HOUR_COST : 0,
        weekendFeeCost: weekendFee ? WEEKEND_FEE_COST : 0,
        eveningFeeCost: eveningFee ? EVENING_FEE_COST : 0,
        // Total amount including all fees (tour + tanguy + extra hour + weekend + evening)
        totalAmount: tourFinalAmount
          + (requestTanguy ? TANGUY_COST : 0)
          + (hasExtraHour ? EXTRA_HOUR_COST : 0)
          + (weekendFee ? WEEKEND_FEE_COST : 0)
          + (eveningFee ? EVENING_FEE_COST : 0),
      },
    };

    console.log('Inserting into pending_tour_bookings:', {
      sessionId: session.id,
      tourType,
      tourId,
      customerEmail,
    });

    // Insert into pending_tour_bookings table
    const { error: pendingError } = await supabase
      .from('pending_tour_bookings')
      .insert({
        stripe_session_id: session.id,
        booking_data: bookingData,
        tour_type: tourType,
      });

    if (pendingError) {
      console.error('Error inserting pending booking:', pendingError);
      throw new Error('Failed to create pending booking');
    }

    console.log('Successfully created pending booking for session:', session.id);

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
