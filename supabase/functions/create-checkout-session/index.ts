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
      upsellProducts = [], // Array of { id, title, quantity, price }
      opMaatAnswers = null, // Op maat specific answers
      existingTourBookingId = null, // Existing tourbooking ID (for local stories - passed from frontend)
    } = await req.json()

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

    if (!tour.price) {
      throw new Error('Tour price not available')
    }

    const finalNumberOfPeople = numberOfPeople; // Use actual number of people for all tour types
    // Apply 10% discount for online bookings
    const discountRate = 0.9; // 10% discount = 90% of original price
    const discountedPrice = tour.price * discountRate;
    const amount = Math.round(discountedPrice * finalNumberOfPeople * 100)
    const tourTitle = tour.title_nl || tour.title_en || 'Tour'
    // For op_maat tours, bookingDate is empty, so don't include it in description
    const description = opMaat 
      ? 'Op Maat Tour' 
      : `${finalNumberOfPeople} person(s) - ${bookingDate && bookingDate.trim() ? bookingDate : 'Date to be determined'}`;

    // Build line items: tour + upsell products
    // Tour line item: unit_amount is the total price (price * numberOfPeople), quantity is 1
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: tourTitle,
            description: description,
          },
          unit_amount: amount, // Total amount for all people (already calculated as tour.price * numberOfPeople * 100)
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
      calculated_total: discountedPrice * finalNumberOfPeople,
      original_total: tour.price * finalNumberOfPeople,
      savings: (tour.price * finalNumberOfPeople) - (discountedPrice * finalNumberOfPeople),
    });

    // Add upsell products as line items
    if (upsellProducts && Array.isArray(upsellProducts) && upsellProducts.length > 0) {
      console.log('Processing upsell products:', {
        count: upsellProducts.length,
        products: upsellProducts.map((p: any) => ({ id: p.id, title: p.title, quantity: p.quantity, price: p.price }))
      });

      // Fetch product details from database to ensure prices are correct
      const productIds = upsellProducts.map((p: any) => p.id);
      const { data: productData, error: productError } = await supabaseClient
        .from('webshop_data')
        .select('uuid, Name, Price (EUR)')
        .in('uuid', productIds);

      if (!productError && productData && productData.length > 0) {
        console.log('Fetched product data from database:', productData.length, 'products');
        // Create a map of product UUIDs to database prices
        const productPriceMap = new Map(
          productData.map((p: any) => [p.uuid, parseFloat(p['Price (EUR)'] || '0')])
        );

        // Add each upsell product as a line item
        for (const upsell of upsellProducts) {
          const dbPrice = productPriceMap.get(upsell.id);
          const finalPrice = dbPrice !== undefined ? dbPrice : (upsell.price || 0);
          const quantity = upsell.quantity || 1;

          if (finalPrice > 0 && quantity > 0) {
            const lineItem = {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: upsell.title || 'Product',
                },
                unit_amount: Math.round(finalPrice * 100), // Convert to cents
              },
              quantity: quantity,
            };
            lineItems.push(lineItem);
            console.log('Added upsell product to line items:', {
              title: upsell.title,
              price: finalPrice,
              quantity: quantity,
              unit_amount: lineItem.price_data.unit_amount
            });
          } else {
            console.warn('Skipping upsell product due to invalid price or quantity:', {
              id: upsell.id,
              title: upsell.title,
              finalPrice,
              quantity
            });
          }
        }
      } else {
        console.warn('Could not fetch product details for upsells, using provided prices:', productError);
        // Fallback: use provided prices
        for (const upsell of upsellProducts) {
          const price = upsell.price || 0;
          const quantity = upsell.quantity || 1;
          if (price > 0 && quantity > 0) {
            const lineItem = {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: upsell.title || 'Product',
                },
                unit_amount: Math.round(price * 100),
              },
              quantity: quantity,
            };
            lineItems.push(lineItem);
            console.log('Added upsell product to line items (fallback):', {
              title: upsell.title,
              price: price,
              quantity: quantity
            });
          }
        }
      }
    } else {
      console.log('No upsell products to add');
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
        upsellProducts: JSON.stringify(upsellProducts), // Store upsell products in metadata
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
      const dateObj = new Date(formattedDateTime);
      if (!isNaN(dateObj.getTime())) {
        tourDatetime = dateObj.toISOString();
        console.log('✓ Using bookingDateTime:', { 
          opMaat, 
          bookingDateTime, 
          formattedDateTime, 
          tourDatetime 
        });
      } else {
        console.error('✗ Invalid bookingDateTime format:', bookingDateTime);
      }
    } else if (bookingDate && bookingDate.trim() && bookingTime && bookingTime.trim()) {
      // Fallback: combine date and time if bookingDateTime is not provided
      // Ensure time has seconds
      const timeWithSeconds = bookingTime.trim().split(':').length === 2 
        ? `${bookingTime.trim()}:00` 
        : bookingTime.trim();
      const combinedDateTime = `${bookingDate.trim()}T${timeWithSeconds}`;
      const dateObj = new Date(combinedDateTime);
      if (!isNaN(dateObj.getTime())) {
        tourDatetime = dateObj.toISOString();
        console.log('✓ Combined date and time:', { 
          opMaat, 
          bookingDate, 
          bookingTime, 
          combinedDateTime, 
          tourDatetime 
        });
      } else {
        console.error('✗ Invalid combined datetime:', combinedDateTime);
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

    const bookingData: any = {
      tour_id: tourId,
      stripe_session_id: session.id,
      status: 'pending',
      tour_datetime: tourDatetime, // This will be null if no date provided, or ISO string if date is provided
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
        amount: tour.price * numberOfPeople, // Calculate amount based on number of people for all tour types
        currency: 'eur',
        upsellProducts: upsellProducts.length > 0 ? upsellProducts : undefined, // Store upsell products in invitee
        // Op maat specific answers
        opMaatAnswers: opMaatAnswers || null,
      }],
    };
    
    console.log('Booking data to be saved:', {
      opMaat,
      tour_datetime: tourDatetime,
      hasTourDatetime: !!tourDatetime,
      tour_datetime_formatted: tourDatetime ? new Date(tourDatetime).toISOString() : null,
      bookingDateTime,
      bookingDate,
      bookingTime,
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
      
      // If existingTourBookingId is passed from frontend, use it directly
      if (existingTourBookingId) {
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
      } else if (saturdayDateStr) {
        // Fallback: If no ID passed, check by date (for backwards compatibility)
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
