import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { nowBrussels, parseBrusselsDateTime, toBrusselsLocalISO, addMinutesBrussels } from '../_shared/timezone.ts';
import { generateUniqueGiftCardCode } from '../_shared/gift-card-generator.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    const isAdminReprocess = req.headers.get('X-Admin-Reprocess') === 'true';
    
    console.info('[Webhook] Received request:', {
      method: req.method,
      url: req.url,
      hasSignature: !!req.headers.get('stripe-signature'),
      isAdminReprocess,
    });

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      console.warn('[Webhook] Invalid method:', req.method);
      return new Response('Method not allowed', { status: 405 });
    }

    // get the raw body
    const body = await req.text();
    console.info('[Webhook] Body received, length:', body.length);

    let event: Stripe.Event;

    if (isAdminReprocess) {
      // Admin reprocess - skip signature verification and parse event directly
      console.info('[Webhook] Admin reprocess mode - skipping signature verification');
      try {
        event = JSON.parse(body) as Stripe.Event;
        console.info('[Webhook] Admin event parsed, event type:', event.type, 'event id:', event.id);
      } catch (error: any) {
        console.error(`[Webhook] Failed to parse admin event: ${error.message}`);
        return new Response(`Failed to parse event: ${error.message}`, { status: 400 });
      }
    } else {
      // Normal webhook - verify signature
      const signature = req.headers.get('stripe-signature');

      if (!signature) {
        console.error('[Webhook] No signature found in headers');
        return new Response('No signature found', { status: 400 });
      }

      console.info('[Webhook] Signature header present:', !!signature);
      console.info('[Webhook] Webhook secret configured:', !!stripeWebhookSecret, stripeWebhookSecret ? `starts with: ${stripeWebhookSecret.substring(0, 10)}...` : 'MISSING');

      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
        console.info('[Webhook] Signature verified, event type:', event.type, 'event id:', event.id);
      } catch (error: any) {
        console.error(`[Webhook] Signature verification failed: ${error.message}`);
        console.error('[Webhook] Debug info:', {
          hasSignature: !!signature,
          signatureLength: signature?.length,
          bodyLength: body.length,
          secretConfigured: !!stripeWebhookSecret,
          secretPrefix: stripeWebhookSecret ? stripeWebhookSecret.substring(0, 15) : 'MISSING',
        });
        return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
      }
    }

    // Process event asynchronously (don't block response to Stripe)
    // Use waitUntil to ensure it completes even after response is sent
    EdgeRuntime.waitUntil(
      handleEvent(event).catch((error) => {
        console.error('[Webhook] Error in handleEvent:', error);
      })
    );

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.info('[handleEvent] Processing event:', {
    type: event.type,
    id: event.id,
    livemode: event.livemode,
  });

  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.error('[handleEvent] No stripe data in event');
    return;
  }

  // Handle checkout session completed events (for tour bookings and webshop orders)
  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    const { id: sessionId, mode, payment_status } = session;
    
    // Retrieve full session early to ensure we have metadata and all data
    // Metadata might not be fully populated in webhook event data
    // This is critical for determining if this is a webshop order
    let fullSession: Stripe.Checkout.Session;
    try {
      fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['total_details.breakdown', 'discounts.promotion_code', 'discounts.promotion_code.coupon'],
      });
      console.info(`✅ Retrieved full session with metadata`);
    } catch (retrieveErr: any) {
      console.error(`❌ Failed to retrieve full session:`, retrieveErr.message);
      // Can't proceed without full session data
      return;
    }
    
    // Use metadata from full session (more reliable than event data)
    const metadata = fullSession.metadata || session.metadata;

    console.info(`Processing checkout.session.completed: ${sessionId}, mode: ${mode}, status: ${payment_status}`);
    console.info(`Session metadata:`, JSON.stringify(metadata || {}));

    // Extract promo code info from fullSession (already retrieved above)
    let promoCodeInfo: { code: string | null; discountAmount: number; discountPercent: number | null } = {
      code: null,
      discountAmount: 0,
      discountPercent: null,
    };

    try {
      // Get discount amount from total_details
      const discountAmountCents = fullSession.total_details?.amount_discount || 0;
      promoCodeInfo.discountAmount = discountAmountCents / 100; // Convert to euros

      // Get promo code from discounts
      if (fullSession.discounts && fullSession.discounts.length > 0) {
        const discount = fullSession.discounts[0] as any; // First discount
        if (discount.promotion_code && typeof discount.promotion_code === 'object') {
          promoCodeInfo.code = discount.promotion_code.code || null;
          // Get discount percent from coupon inside promotion_code
          if (discount.promotion_code.coupon) {
            promoCodeInfo.discountPercent = discount.promotion_code.coupon.percent_off || null;
          }
        }
      }

      console.info('Promo code info extracted:', promoCodeInfo);
    } catch (promoError) {
      console.error('Error retrieving promo code info:', promoError);
      // Continue without promo code info - not critical
    }

    if (mode === 'payment' && payment_status === 'paid') {
      // First, check if this is a tour booking by looking for pending_tour_bookings entry
      const { data: pendingBooking, error: pendingError } = await supabase
        .from('pending_tour_bookings')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (pendingError) {
        console.error('Error fetching pending tour booking:', pendingError);
        // If table doesn't exist or query fails, check metadata for tour indicator
        if (metadata?.tourId) {
          console.error('This appears to be a tour booking but pending_tour_bookings query failed. Ensure the table exists.');
        }
      }

      if (pendingBooking) {
        // This is a tour booking - process it
        console.info(`Found pending tour booking for session ${sessionId}, type: ${pendingBooking.tour_type}`);

        const bookingData = pendingBooking.booking_data;
        const tourType = pendingBooking.tour_type;

        // Log the full booking data for debugging
        console.info('Booking data from pending:', JSON.stringify({
          tourId: bookingData?.tourId,
          customerEmail: bookingData?.customerEmail,
          tourType,
          hasAmounts: !!bookingData?.amounts,
          amounts: bookingData?.amounts,
          hasShippingAddress: !!bookingData?.shippingAddress,
          shippingAddress: bookingData?.shippingAddress,
          customerName: bookingData?.customerName,
        }));

        // Validate required booking data
        if (!bookingData || !bookingData.tourId || !bookingData.customerEmail) {
          console.error('Invalid booking data in pending_tour_bookings:', {
            hasBookingData: !!bookingData,
            hasTourId: !!bookingData?.tourId,
            hasCustomerEmail: !!bookingData?.customerEmail,
          });
          // Don't delete the pending booking so we can investigate
          return;
        }

        // Ensure amounts object exists with defaults
        if (!bookingData.amounts) {
          console.warn('No amounts object in bookingData, creating defaults');
          bookingData.amounts = {
            tourFullPrice: 0,
            discountAmount: 0,
            tourFinalAmount: 0,
            tanguyCost: 0,
            extraHourCost: 0,
            weekendFeeCost: 0,
            eveningFeeCost: 0,
            totalAmount: 0,
          };
        }

        // Ensure totalAmount exists (backwards compatibility for older pending bookings)
        if (bookingData.amounts.totalAmount === undefined) {
          bookingData.amounts.totalAmount =
            (bookingData.amounts.tourFinalAmount || 0) +
            (bookingData.amounts.tanguyCost || 0) +
            (bookingData.amounts.extraHourCost || 0) +
            (bookingData.amounts.weekendFeeCost || 0) +
            (bookingData.amounts.eveningFeeCost || 0);
          console.info('Calculated totalAmount from individual amounts:', bookingData.amounts.totalAmount);
        }

        // Check if booking already exists (idempotency)
        const { data: existingBooking } = await supabase
          .from('tourbooking')
          .select('id, status')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();

        if (existingBooking && existingBooking.status === 'payment_completed') {
          console.info(`Tour booking already exists for session ${sessionId}, skipping creation`);
          // Still call webhook even if booking already exists (idempotency - n8n should handle duplicates)
          const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';
          const payload = {
            ...session,
            metadata: {
              ...metadata,
              stripe_session_id: sessionId,
              booking_id: existingBooking.id,
              isDuplicate: true, // Flag to indicate this is a duplicate payment
            },
            bookingData,
            promoCode: promoCodeInfo.code,
            promoDiscountAmount: promoCodeInfo.discountAmount,
            promoDiscountPercent: promoCodeInfo.discountPercent,
          };
          
          try {
            console.info('[N8N] Calling tour booking webhook for duplicate payment', {
              url: n8nWebhookUrl,
              sessionId,
              bookingId: existingBooking.id,
            });
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const res = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            console.info('[N8N] Duplicate payment webhook response', {
              status: res.status,
              ok: res.ok,
            });
            
            if (!res.ok) {
              const text = await res.text();
              console.error('[N8N] Duplicate payment webhook error body', text);
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              console.error('[N8N] Webhook call timed out after 30 seconds');
            } else {
              console.error('[N8N] Failed to call tour booking webhook for duplicate payment', err);
            }
          }
          
          // Delete pending entry and return
          await supabase.from('pending_tour_bookings').delete().eq('id', pendingBooking.id);
          return;
        }

        let createdBookingId: number | null = null;

        try {
        // Process based on tour type
        if (tourType === 'local_stories') {
          // LOCAL STORIES: Find or create shared tourbooking, append invitee, create local_tours_bookings

          // Log available date fields for debugging
          console.info('Local stories booking data:', JSON.stringify({
            saturdayDateStr: bookingData.saturdayDateStr,
            bookingDate: bookingData.bookingDate,
            bookingDateTime: bookingData.bookingDateTime,
            bookingTime: bookingData.bookingTime,
            tourDatetime: bookingData.tourDatetime,
            tourEndDatetime: bookingData.tourEndDatetime,
            tourId: bookingData.tourId,
            customerEmail: bookingData.customerEmail,
            numberOfPeople: bookingData.numberOfPeople,
          }));

          // Derive booking date from multiple sources (fallback chain)
          let saturdayDateStr = bookingData.saturdayDateStr || '';
          if (!saturdayDateStr) {
            // Try bookingDate
            if (bookingData.bookingDate) {
              saturdayDateStr = bookingData.bookingDate;
            }
            // Try bookingDateTime
            else if (bookingData.bookingDateTime) {
              saturdayDateStr = bookingData.bookingDateTime.split('T')[0];
            }
            // Try tourDatetime
            else if (bookingData.tourDatetime) {
              saturdayDateStr = bookingData.tourDatetime.split('T')[0];
            }
          }

          if (!saturdayDateStr) {
            console.error('ERROR: No booking date could be derived for local stories tour. Available data:', JSON.stringify(bookingData));
          }

          console.info(`Processing local stories booking for Saturday: ${saturdayDateStr || 'NO DATE AVAILABLE'}`);

          let tourbookingId: number | null = null;
          // Create proper ISO string WITHOUT timezone offset for Saturday 14:00 (Brussels local time)
          let saturdayDateTime: string | null = null;
          if (saturdayDateStr) {
            try {
              const parsedDate = parseBrusselsDateTime(saturdayDateStr, '14:00');
              saturdayDateTime = toBrusselsLocalISO(parsedDate);
            } catch (e) {
              console.error('Error creating saturdayDateTime:', e);
            }
          }

          // Look for existing tourbooking for this Saturday
          if (saturdayDateStr) {
            // Create proper ISO strings WITHOUT timezone offset for query comparison (Brussels local time)
            const startOfDay = toBrusselsLocalISO(parseBrusselsDateTime(saturdayDateStr, '00:00'));
            const endOfDay = toBrusselsLocalISO(parseBrusselsDateTime(saturdayDateStr, '23:59'));
            
            const { data: existingTourBookings } = await supabase
              .from('tourbooking')
              .select('id, invitees')
              .eq('tour_id', bookingData.tourId)
              .gte('tour_datetime', startOfDay)
              .lt('tour_datetime', endOfDay);

            if (existingTourBookings && existingTourBookings.length > 0) {
              // Use existing tourbooking
              const existingTourBooking = existingTourBookings[0];
              tourbookingId = existingTourBooking.id;
              // Set createdBookingId immediately so Stoqflow order creation can use it
              createdBookingId = tourbookingId;

              // Append new invitee to existing invitees
              const currentInvitees = existingTourBooking.invitees || [];
              const newInvitee: any = {
                name: bookingData.customerName,
                email: bookingData.customerEmail,
                phone: bookingData.customerPhone,
                numberOfPeople: bookingData.numberOfPeople,
                language: bookingData.language,
                contactLanguage: bookingData.contactLanguage || 'nl', // Language for email communications
                specialRequests: bookingData.specialRequests,
                requestTanguy: bookingData.requestTanguy,
                amount: bookingData.amounts.totalAmount || (bookingData.amounts.tourFinalAmount + (bookingData.amounts.tanguyCost || 0) + (bookingData.amounts.extraHourCost || 0) + (bookingData.amounts.weekendFeeCost || 0) + (bookingData.amounts.eveningFeeCost || 0)),
                originalAmount: bookingData.amounts.tourFullPrice,
                discountApplied: bookingData.amounts.discountAmount,
                tanguyCost: bookingData.amounts.tanguyCost,
                extraHourCost: bookingData.amounts.extraHourCost,
                weekendFeeCost: bookingData.amounts.weekendFeeCost,
                eveningFeeCost: bookingData.amounts.eveningFeeCost,
                currency: 'eur',
                isContacted: false,
                upsellProducts: bookingData.upsellProducts,
                opMaatAnswers: bookingData.opMaatAnswers,
                tourStartDatetime: bookingData.tourDatetime,
                tourEndDatetime: bookingData.tourEndDatetime,
                durationMinutes: bookingData.durationMinutes,
                // Promo code info from Stripe
                promoCode: promoCodeInfo.code,
                promoDiscountAmount: promoCodeInfo.discountAmount,
                promoDiscountPercent: promoCodeInfo.discountPercent,
              };

              // Store shipping address in invitee data for Stoqflow order creation
              if (bookingData.shippingAddress) {
                newInvitee.shippingAddress = bookingData.shippingAddress;
                console.info('[Local Stories] Stored shipping address in invitee data');
              }

              const updatedInvitees = [...currentInvitees, newInvitee];
              
              // Prepare update data including shipping address
              const updateData: any = {
                invitees: updatedInvitees,
                stripe_session_id: sessionId, // Update to latest session
                status: 'payment_completed'
              };

              // Store shipping address in tourbooking table if available
              // Note: Only add these fields if the columns exist (migration may not be applied yet)
              const shippingAddress = bookingData?.shippingAddress;
              if (shippingAddress) {
                // Helper to normalize country code to ISO format
                const normalizeCountry = (country: string | null | undefined): string => {
                  if (!country) return 'BE';
                  const countryLower = country.toLowerCase().trim();
                  const countryMap: Record<string, string> = {
                    'belgië': 'BE', 'belgium': 'BE', 'belgique': 'BE', 'belgien': 'BE',
                    'nederland': 'NL', 'netherlands': 'NL', 'pays-bas': 'NL', 'niederlande': 'NL',
                    'france': 'FR', 'frankrijk': 'FR',
                    'deutschland': 'DE', 'germany': 'DE', 'duitsland': 'DE',
                    'luxembourg': 'LU', 'luxemburg': 'LU',
                  };
                  if (/^[A-Z]{2}$/.test(country)) return country;
                  return countryMap[countryLower] || 'BE';
                };

                // Try to add shipping address columns, but don't fail if they don't exist
                // The migration will add these columns, but we need to handle the case where it's not applied yet
                try {
                  updateData.shipping_full_name = shippingAddress.fullName || null;
                  updateData.shipping_street = shippingAddress.street || null;
                  updateData.shipping_city = shippingAddress.city || null;
                  updateData.shipping_postal_code = shippingAddress.postalCode || null;
                  updateData.shipping_country = normalizeCountry(shippingAddress.country);
                  console.info('[Local Stories] Storing shipping address in tourbooking table');
                } catch (err) {
                  console.warn('[Local Stories] Shipping address columns may not exist yet - storing in invitee data only:', err);
                }
              }

              await supabase
                .from('tourbooking')
                .update(updateData)
                .eq('id', tourbookingId);

              console.info(`Appended invitee to existing tourbooking ${tourbookingId}`);
            }
          }

          // If no existing tourbooking, create new one
          if (!tourbookingId) {
            const newTourBooking = {
              tour_id: bookingData.tourId,
              stripe_session_id: sessionId,
              status: 'payment_completed',
              tour_datetime: bookingData.tourDatetime || saturdayDateTime,
              tour_end: bookingData.tourEndDatetime,
              city: bookingData.citySlug,
              request_tanguy: bookingData.requestTanguy,
              user_id: bookingData.userId,
              invitees: [{
                name: bookingData.customerName,
                email: bookingData.customerEmail,
                phone: bookingData.customerPhone,
                numberOfPeople: bookingData.numberOfPeople,
                language: bookingData.language,
                contactLanguage: bookingData.contactLanguage || 'nl', // Language for email communications
                specialRequests: bookingData.specialRequests,
                requestTanguy: bookingData.requestTanguy,
                amount: bookingData.amounts.totalAmount || (bookingData.amounts.tourFinalAmount + (bookingData.amounts.tanguyCost || 0) + (bookingData.amounts.extraHourCost || 0) + (bookingData.amounts.weekendFeeCost || 0) + (bookingData.amounts.eveningFeeCost || 0)),
                originalAmount: bookingData.amounts.tourFullPrice,
                discountApplied: bookingData.amounts.discountAmount,
                tanguyCost: bookingData.amounts.tanguyCost,
                extraHourCost: bookingData.amounts.extraHourCost,
                weekendFeeCost: bookingData.amounts.weekendFeeCost,
                eveningFeeCost: bookingData.amounts.eveningFeeCost,
                currency: 'eur',
                isContacted: false,
                upsellProducts: bookingData.upsellProducts,
                opMaatAnswers: bookingData.opMaatAnswers,
                tourStartDatetime: bookingData.tourDatetime,
                tourEndDatetime: bookingData.tourEndDatetime,
                durationMinutes: bookingData.durationMinutes,
                // Promo code info from Stripe
                promoCode: promoCodeInfo.code,
                promoDiscountAmount: promoCodeInfo.discountAmount,
                promoDiscountPercent: promoCodeInfo.discountPercent,
              }],
            };

            const { data: newBooking, error: insertError } = await supabase
              .from('tourbooking')
              .insert(newTourBooking)
              .select('id')
              .single();

            if (insertError) {
              console.error('Error creating new tourbooking for local stories:', insertError);
              throw new Error(`Failed to create local stories tourbooking: ${insertError.message}`);
            } else if (!newBooking || !newBooking.id) {
              console.error('Error: newBooking or newBooking.id is null after insert');
              throw new Error('Failed to create local stories tourbooking: No ID returned');
            } else {
              tourbookingId = newBooking.id;
              console.info(`Created new tourbooking ${tourbookingId} for local stories`);
            }
          }

          createdBookingId = tourbookingId;

          // Create local_tours_bookings entry for this customer
          // Each customer gets their own row (local stories tours can have multiple customers)
          if (tourbookingId && saturdayDateStr) {
            // Derive booking time - handle HH:mm and HH:mm:ss formats
            let bookingTimeStr = '14:00:00';
            if (bookingData.bookingTime) {
              const timeParts = bookingData.bookingTime.split(':');
              if (timeParts.length === 2) {
                // HH:mm format - add seconds
                bookingTimeStr = `${bookingData.bookingTime}:00`;
              } else if (timeParts.length >= 3) {
                // Already HH:mm:ss format
                bookingTimeStr = bookingData.bookingTime;
              }
            }

            console.info(`Creating local_tours_bookings entry: date=${saturdayDateStr}, time=${bookingTimeStr}, tourId=${bookingData.tourId}, customer=${bookingData.customerEmail}`);

            // Extract shipping address from bookingData
            const shippingAddress = bookingData?.shippingAddress;
            const localBookingData: any = {
              tour_id: bookingData.tourId,
              booking_date: saturdayDateStr,
              booking_time: bookingTimeStr,
              is_booked: true,
              status: 'booked',
              customer_name: bookingData.customerName,
              customer_email: bookingData.customerEmail,
              customer_phone: bookingData.customerPhone,
              stripe_session_id: sessionId,
              booking_id: tourbookingId,
              amnt_of_people: bookingData.numberOfPeople,
              user_id: bookingData.userId,
              isContacted: false,
            };

            // Store shipping address if available
            if (shippingAddress) {
              // Helper to normalize country code (defined above in Stoqflow section, but also needed here)
              const normalizeCountry = (country: string | null | undefined): string => {
                if (!country) return 'BE';
                const countryLower = country.toLowerCase().trim();
                const countryMap: Record<string, string> = {
                  'belgië': 'BE', 'belgium': 'BE', 'belgique': 'BE', 'belgien': 'BE',
                  'nederland': 'NL', 'netherlands': 'NL', 'pays-bas': 'NL', 'niederlande': 'NL',
                  'france': 'FR', 'frankrijk': 'FR',
                  'deutschland': 'DE', 'germany': 'DE', 'duitsland': 'DE',
                  'luxembourg': 'LU', 'luxemburg': 'LU',
                };
                if (/^[A-Z]{2}$/.test(country)) return country;
                return countryMap[countryLower] || 'BE';
              };

              localBookingData.shipping_full_name = shippingAddress.fullName || null;
              localBookingData.shipping_street = shippingAddress.street || null;
              localBookingData.shipping_city = shippingAddress.city || null;
              localBookingData.shipping_postal_code = shippingAddress.postalCode || null;
              localBookingData.shipping_country = normalizeCountry(shippingAddress.country);
              
              console.info('[Local Stories] Storing shipping address in local_tours_bookings:', {
                hasFullName: !!localBookingData.shipping_full_name,
                hasStreet: !!localBookingData.shipping_street,
                hasCity: !!localBookingData.shipping_city,
                hasPostalCode: !!localBookingData.shipping_postal_code,
              });
            } else {
              console.warn('[Local Stories] No shipping address in bookingData for local_tours_bookings');
            }

            // Always insert a new entry - each customer booking gets their own row
            // If insert fails due to missing shipping columns, retry without them
            let { error: localInsertError } = await supabase
              .from('local_tours_bookings')
              .insert(localBookingData);

            // If error is about missing shipping columns, retry without them
            if (localInsertError && localInsertError.message && localInsertError.message.includes('shipping_')) {
              console.warn('[Local Stories] Shipping address columns don\'t exist yet in local_tours_bookings, retrying insert without them');
              const { shipping_full_name, shipping_street, shipping_city, shipping_postal_code, shipping_country, ...bookingWithoutShipping } = localBookingData;
              const retryResult = await supabase
                .from('local_tours_bookings')
                .insert(bookingWithoutShipping);
              localInsertError = retryResult.error;
            }

            if (localInsertError) {
              console.error('Error creating local_tours_bookings:', localInsertError);
              // Don't throw - the booking is already created in tourbooking, so we can continue
            } else {
              console.info(`Created local_tours_bookings entry for session ${sessionId}`);
            }
          }

        } else {
          // STANDARD or OP_MAAT: Simple insert
          console.info(`Processing ${tourType} booking`);

          const newInvitee: any = {
            name: bookingData.customerName,
            email: bookingData.customerEmail,
            phone: bookingData.customerPhone,
            numberOfPeople: bookingData.numberOfPeople,
            language: bookingData.language,
            contactLanguage: bookingData.contactLanguage || 'nl', // Language for email communications
            specialRequests: bookingData.specialRequests,
            requestTanguy: bookingData.requestTanguy,
            amount: bookingData.amounts.totalAmount || (bookingData.amounts.tourFinalAmount + (bookingData.amounts.tanguyCost || 0) + (bookingData.amounts.extraHourCost || 0) + (bookingData.amounts.weekendFeeCost || 0) + (bookingData.amounts.eveningFeeCost || 0)),
            originalAmount: bookingData.amounts.tourFullPrice,
            discountApplied: bookingData.amounts.discountAmount,
            tanguyCost: bookingData.amounts.tanguyCost,
            extraHourCost: bookingData.amounts.extraHourCost,
            weekendFeeCost: bookingData.amounts.weekendFeeCost,
            eveningFeeCost: bookingData.amounts.eveningFeeCost,
            currency: 'eur',
            isContacted: false,
            upsellProducts: bookingData.upsellProducts,
            opMaatAnswers: bookingData.opMaatAnswers,
            tourStartDatetime: bookingData.tourDatetime,
            tourEndDatetime: bookingData.tourEndDatetime,
            durationMinutes: bookingData.durationMinutes,
            // Promo code info from Stripe
            promoCode: promoCodeInfo.code,
            promoDiscountAmount: promoCodeInfo.discountAmount,
            promoDiscountPercent: promoCodeInfo.discountPercent,
          };

          // Store shipping address in invitee data for Stoqflow order creation
          if (bookingData.shippingAddress) {
            newInvitee.shippingAddress = bookingData.shippingAddress;
            console.info('[Standard/OpMaat] Stored shipping address in invitee data');
          }

          // Prepare tourbooking data including shipping address
          const newTourBooking: any = {
            tour_id: bookingData.tourId,
            stripe_session_id: sessionId,
            status: 'payment_completed',
            tour_datetime: bookingData.tourDatetime,
            tour_end: bookingData.tourEndDatetime,
            city: bookingData.citySlug,
            request_tanguy: bookingData.requestTanguy,
            user_id: bookingData.userId,
            invitees: [newInvitee],
          };

          // Store shipping address in tourbooking table if available
          // Note: Only add these fields if the columns exist (migration may not be applied yet)
          const shippingAddress = bookingData?.shippingAddress;
          if (shippingAddress) {
            // Helper to normalize country code to ISO format
            const normalizeCountry = (country: string | null | undefined): string => {
              if (!country) return 'BE';
              const countryLower = country.toLowerCase().trim();
              const countryMap: Record<string, string> = {
                'belgië': 'BE', 'belgium': 'BE', 'belgique': 'BE', 'belgien': 'BE',
                'nederland': 'NL', 'netherlands': 'NL', 'pays-bas': 'NL', 'niederlande': 'NL',
                'france': 'FR', 'frankrijk': 'FR',
                'deutschland': 'DE', 'germany': 'DE', 'duitsland': 'DE',
                'luxembourg': 'LU', 'luxemburg': 'LU',
              };
              if (/^[A-Z]{2}$/.test(country)) return country;
              return countryMap[countryLower] || 'BE';
            };

            // Try to add shipping address columns, but don't fail if they don't exist
            // The migration will add these columns, but we need to handle the case where it's not applied yet
            try {
              newTourBooking.shipping_full_name = shippingAddress.fullName || null;
              newTourBooking.shipping_street = shippingAddress.street || null;
              newTourBooking.shipping_city = shippingAddress.city || null;
              newTourBooking.shipping_postal_code = shippingAddress.postalCode || null;
              newTourBooking.shipping_country = normalizeCountry(shippingAddress.country);
              console.info('[Standard/OpMaat] Storing shipping address in tourbooking table');
            } catch (err) {
              console.warn('[Standard/OpMaat] Shipping address columns may not exist yet - storing in invitee data only:', err);
            }
          }

          // Try insert - if it fails due to missing shipping columns, retry without them
          let { data: newBooking, error: insertError } = await supabase
            .from('tourbooking')
            .insert(newTourBooking)
            .select('id')
            .single();

          // If error is about missing shipping columns, retry without them
          if (insertError && insertError.message && insertError.message.includes('shipping_')) {
            console.warn(`[${tourType}] Shipping address columns don't exist yet, retrying insert without them`);
            const { shipping_full_name, shipping_street, shipping_city, shipping_postal_code, shipping_country, ...bookingWithoutShipping } = newTourBooking;
            const retryResult = await supabase
              .from('tourbooking')
              .insert(bookingWithoutShipping)
              .select('id')
              .single();
            newBooking = retryResult.data;
            insertError = retryResult.error;
          }

          if (insertError) {
            console.error(`Error creating ${tourType} tourbooking:`, insertError);
            throw new Error(`Failed to create ${tourType} tourbooking: ${insertError.message}`);
          } else if (!newBooking || !newBooking.id) {
            console.error(`Error: newBooking or newBooking.id is null after insert for ${tourType}`);
            throw new Error(`Failed to create ${tourType} tourbooking: No ID returned`);
          } else {
            createdBookingId = newBooking.id;
            console.info(`Created ${tourType} tourbooking ${createdBookingId}`);
          }
        }

        // Delete pending booking entry (only if booking was created successfully)
        if (createdBookingId) {
          await supabase.from('pending_tour_bookings').delete().eq('id', pendingBooking.id);
          console.info(`Deleted pending booking entry for session ${sessionId}`);
        }

        // Redeem gift card if one was applied at checkout
        const giftCardCodeToRedeem = metadata?.giftCardCode;
        const giftCardDiscountAmount = metadata?.giftCardDiscount ? parseFloat(metadata.giftCardDiscount) : 0;
        if (giftCardCodeToRedeem && giftCardCodeToRedeem.trim() && giftCardDiscountAmount > 0 && createdBookingId) {
          try {
            console.info(`[Gift Card Redemption] Processing redemption for tour booking, code: ${giftCardCodeToRedeem}, discount amount: ${giftCardDiscountAmount} EUR`);
            
            // Redeem gift card directly (we're already in a service role context)
            const normalizedCode = giftCardCodeToRedeem.trim().toUpperCase().replace(/\s+/g, '');
            
            // Get the gift card
            const { data: giftCard, error: fetchError } = await supabase
              .from('gift_cards')
              .select('id, code, current_balance, status, expires_at')
              .eq('code', normalizedCode)
              .eq('status', 'active')
              .single();

            if (!fetchError && giftCard) {
              const currentBalance = parseFloat(giftCard.current_balance.toString());
              // Use the actual discount amount that was applied (not the order total)
              const amountToUse = Math.min(currentBalance, giftCardDiscountAmount);
              const newBalance = currentBalance - amountToUse;

              // Update gift card balance
              const { error: updateError } = await supabase
                .from('gift_cards')
                .update({
                  current_balance: newBalance,
                  last_used_at: new Date().toISOString(),
                  status: newBalance <= 0 ? 'redeemed' : 'active',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', giftCard.id)
                .eq('current_balance', currentBalance); // Optimistic locking

              if (!updateError) {
                // Record transaction
                await supabase
                  .from('gift_card_transactions')
                  .insert({
                    gift_card_id: giftCard.id,
                    order_id: sessionId,
                    stripe_order_id: null, // Tour bookings don't have stripe_orders
                    amount_used: amountToUse,
                    balance_before: currentBalance,
                    balance_after: newBalance,
                    transaction_type: 'redemption',
                  });

                console.info(`[Gift Card Redemption] Successfully redeemed for tour booking: ${amountToUse} EUR, remaining balance: ${newBalance} EUR`);
              } else {
                console.error(`[Gift Card Redemption] Failed to update gift card balance:`, updateError);
              }
            } else {
              console.error(`[Gift Card Redemption] Gift card not found or inactive:`, fetchError);
            }
          } catch (redeemError: any) {
            console.error('[Gift Card Redemption] Error redeeming gift card for tour booking:', redeemError);
            // Don't fail the booking - gift card redemption failure shouldn't block booking completion
          }
        }

        // Log booking creation status
        if (!createdBookingId) {
          console.error('[ERROR] createdBookingId is null after booking creation!', {
            tourType,
            sessionId,
            bookingDataTourId: bookingData?.tourId,
            customerEmail: bookingData?.customerEmail,
          });
          // Don't return early - continue to try to call webhook with error info
          // The error will be handled in the catch block
        } else {
          console.info('[SUCCESS] Booking created successfully:', {
            bookingId: createdBookingId,
            tourType,
            sessionId,
          });
        }

        // Create Stoqflow order for upsell products if any are present
        let stoqflowOrderId: string | null = null;
        const upsellProducts = bookingData?.upsellProducts;
        console.info('[Stoqflow] Checking if Stoqflow order should be created:', {
          hasUpsellProducts: !!upsellProducts,
          isArray: Array.isArray(upsellProducts),
          upsellProductsLength: upsellProducts?.length || 0,
          createdBookingId: createdBookingId,
          tourType: tourType,
          upsellProducts: upsellProducts,
          shippingAddress: bookingData?.shippingAddress,
          customerName: bookingData?.customerName,
          customerEmail: bookingData?.customerEmail,
        });
        if (upsellProducts && Array.isArray(upsellProducts) && upsellProducts.length > 0 && createdBookingId) {
          try {
            const stoqflowClientId = Deno.env.get('STOQFLOW_CLIENT_ID');
            const stoqflowClientSecret = Deno.env.get('STOQFLOW_CLIENT_SECRET');
            const stoqflowShopId = Deno.env.get('STOQFLOW_SHOP_ID');
            const stoqflowBaseUrl = Deno.env.get('STOQFLOW_BASE_URL');

            if (stoqflowClientId && stoqflowClientSecret && stoqflowShopId && stoqflowBaseUrl) {
              console.info('[Stoqflow] Creating order in Stoqflow for tour booking upsell products', {
                sessionId,
                bookingId: createdBookingId,
                upsellProductCount: upsellProducts.length,
              });

              // Create Basic Auth header
              const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
              const basicAuth = btoa(credentials);
              const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;

              // Helper function to normalize country name to ISO code (Stoqflow requires ISO codes)
              const normalizeCountryCode = (country: string | null | undefined): string => {
                if (!country) return 'BE';
                
                const countryLower = country.toLowerCase().trim();
                
                // Map common country names to ISO codes
                const countryMap: Record<string, string> = {
                  'belgië': 'BE',
                  'belgium': 'BE',
                  'belgique': 'BE',
                  'belgien': 'BE',
                  'nederland': 'NL',
                  'netherlands': 'NL',
                  'pays-bas': 'NL',
                  'niederlande': 'NL',
                  'france': 'FR',
                  'frankrijk': 'FR',
                  'deutschland': 'DE',
                  'germany': 'DE',
                  'duitsland': 'DE',
                  'luxembourg': 'LU',
                  'luxemburg': 'LU',
                };
                
                // Check if it's already an ISO code (2 uppercase letters)
                if (/^[A-Z]{2}$/.test(country)) {
                  return country;
                }
                
                // Map country name to ISO code
                return countryMap[countryLower] || 'BE'; // Default to BE if not found
              };

              // Helper function to generate SKU from product ID (same as sync-webshop-to-stoqflow)
              const generateSKU = (productId: string): string => {
                const id = productId || '';
                if (!id) {
                  return `WS${Date.now().toString().slice(-10)}`;
                }
                // Remove dashes and other non-alphanumeric characters (same as sync function)
                let sku = id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
                if (sku.length < 3) {
                  sku = `WS${sku}`.substring(0, 50);
                }
                sku = sku.replace(/::/g, '-').replace(/\|\|/g, '-');
                return sku;
              };
              
              // Helper function to lookup product in webshop_data to get Stoqflow ID
              const lookupProductInDatabase = async (productUuid: string): Promise<string | null> => {
                try {
                  const { data: product, error } = await supabase
                    .from('webshop_data')
                    .select('stoqflow_id, uuid')
                    .eq('uuid', productUuid)
                    .single();
                  
                  if (!error && product?.stoqflow_id) {
                    console.info(`[Stoqflow] Found Stoqflow ID in database: ${product.stoqflow_id} for UUID: ${productUuid}`);
                    return product.stoqflow_id;
                  }
                } catch (err: any) {
                  console.warn(`[Stoqflow] Error looking up product in database:`, err.message);
                }
                return null;
              };
              
              // Helper function to search Stoqflow product with retry and backoff
              const searchStoqflowProduct = async (sku: string, retries = 3): Promise<any> => {
                for (let attempt = 0; attempt < retries; attempt++) {
                  try {
                    // Add delay before retry (exponential backoff)
                    if (attempt > 0) {
                      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
                      console.info(`[Stoqflow] Retrying product lookup (attempt ${attempt + 1}/${retries}) after ${delayMs}ms delay`);
                      await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                    
                    const productSearchRes = await fetch(`${apiBaseUrl}/products?sku=${encodeURIComponent(sku)}&fields=*`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${basicAuth}`,
                      },
                    });
                    
                    if (productSearchRes.status === 429) {
                      // Rate limited - wait longer and retry
                      if (attempt < retries - 1) {
                        const retryAfter = parseInt(productSearchRes.headers.get('Retry-After') || '60');
                        console.warn(`[Stoqflow] Rate limited (429), waiting ${retryAfter}s before retry`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        continue;
                      }
                    }
                    
                    if (productSearchRes.ok) {
                      const productData = await productSearchRes.json();
                      if (Array.isArray(productData) && productData.length > 0) {
                        return productData[0];
                      }
                    }
                    
                    // If not rate limited and not found, don't retry
                    if (productSearchRes.status !== 429) {
                      break;
                    }
                  } catch (err: any) {
                    console.warn(`[Stoqflow] Error searching product (attempt ${attempt + 1}):`, err.message);
                    if (attempt === retries - 1) throw err;
                  }
                }
                return null;
              };

              // Convert upsell products to Stoqflow order items
              // Upsell products format: {id, n: name, p: price, q: quantity}
              const stoqflowOrderItems: any[] = [];

              for (const upsell of upsellProducts) {
                const productId = upsell.id;
                const quantity = upsell.q !== undefined ? upsell.q : (upsell.quantity || 1);

                if (!productId || quantity <= 0) {
                  console.warn('[Stoqflow] Skipping invalid upsell product:', upsell);
                  continue;
                }

                try {
                  // Check if productId looks like a Stoqflow ID (base58 format, ~17 chars)
                  const looksLikeStoqflowId = /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{15,20}$/.test(productId);

                  if (looksLikeStoqflowId) {
                    // Assume it's already a Stoqflow product ID
                    stoqflowOrderItems.push({
                      product_id: productId,
                      quantity: quantity,
                    });
                    console.info(`[Stoqflow] Using product_id directly (looks like Stoqflow ID): ${productId}`);
                  } else {
                    // It's a UUID - first try to get Stoqflow ID from database
                    let stoqflowProductId = await lookupProductInDatabase(productId);
                    
                    if (stoqflowProductId) {
                      // Found Stoqflow ID in database
                      stoqflowOrderItems.push({
                        product_id: stoqflowProductId,
                        quantity: quantity,
                      });
                      console.info(`[Stoqflow] Using Stoqflow ID from database: ${stoqflowProductId}`);
                    } else {
                      // Not in database - generate SKU and search Stoqflow API (with retry)
                      const sku = generateSKU(productId);
                      console.info(`[Stoqflow] Looking up product by SKU: ${sku} (from product ID: ${productId})`);

                      const stoqflowProduct = await searchStoqflowProduct(sku);
                      
                      if (stoqflowProduct) {
                        stoqflowOrderItems.push({
                          product_id: stoqflowProduct._id,
                          quantity: quantity,
                        });
                        console.info(`[Stoqflow] Found product: ${stoqflowProduct._id} (SKU: ${sku})`);
                      } else {
                        // Product not found - skip this item (Stoqflow requires product_id)
                        console.warn(`[Stoqflow] Product not found for SKU ${sku}, skipping item (product_id required by Stoqflow)`);
                        // Don't add item without product_id - Stoqflow will reject it
                      }
                    }
                  }
                } catch (lookupErr: any) {
                  console.warn(`[Stoqflow] Failed to lookup product for ${productId}:`, lookupErr.message);
                  // Don't add item without product_id - Stoqflow will reject it
                }
              }

              // Filter out items without product_id (Stoqflow requires product_id for all items)
              const validOrderItems = stoqflowOrderItems.filter((item: any) => item.product_id);
              
              // Log if some items were filtered out
              if (validOrderItems.length < stoqflowOrderItems.length) {
                console.warn(`[Stoqflow] Filtered out ${stoqflowOrderItems.length - validOrderItems.length} items without product_id. Proceeding with ${validOrderItems.length} valid items.`);
              }
              
              // Ensure we have at least one valid order item (required by API)
              if (validOrderItems.length === 0) {
                console.warn('[Stoqflow] No valid order items (all items missing product_id), skipping Stoqflow order creation');
              } else {
                // Helper function to convert country name to ISO code
                const normalizeCountryCode = (country: string | null | undefined): string => {
                  if (!country) return 'BE';
                  
                  const countryLower = country.toLowerCase().trim();
                  
                  // Map common country names to ISO codes
                  const countryMap: Record<string, string> = {
                    'belgië': 'BE',
                    'belgium': 'BE',
                    'belgique': 'BE',
                    'belgien': 'BE',
                    'nederland': 'NL',
                    'netherlands': 'NL',
                    'pays-bas': 'NL',
                    'niederlande': 'NL',
                    'france': 'FR',
                    'frankrijk': 'FR',
                    'deutschland': 'DE',
                    'germany': 'DE',
                    'duitsland': 'DE',
                    'luxembourg': 'LU',
                    'luxemburg': 'LU',
                  };
                  
                  // Check if it's already an ISO code (2 uppercase letters)
                  if (/^[A-Z]{2}$/.test(country)) {
                    return country;
                  }
                  
                  // Map country name to ISO code
                  return countryMap[countryLower] || 'BE'; // Default to BE if not found
                };

                // Prepare client_info from shipping address (always required)
                const clientInfo: any = {};
                let shippingAddress = bookingData?.shippingAddress;
                
                console.info('[Stoqflow] Extracting shipping address:', {
                  hasShippingAddressInBookingData: !!shippingAddress,
                  shippingAddressType: typeof shippingAddress,
                  shippingAddress: JSON.stringify(shippingAddress),
                  shippingAddressKeys: shippingAddress ? Object.keys(shippingAddress) : [],
                  customerName: bookingData?.customerName,
                  bookingId: createdBookingId,
                });
                
                // If shipping address not in bookingData, try to fetch from database
                if (!shippingAddress && createdBookingId) {
                  // First try: fetch from tourbooking table (works for all tour types)
                  console.info('[Stoqflow] Shipping address not in bookingData, fetching from tourbooking table...');
                  try {
                    const { data: tourBooking } = await supabase
                      .from('tourbooking')
                      .select('shipping_full_name, shipping_street, shipping_city, shipping_postal_code, shipping_country, invitees')
                      .eq('id', createdBookingId)
                      .maybeSingle();
                    
                    if (tourBooking) {
                      // Check if shipping address is stored in tourbooking table columns
                      if (tourBooking.shipping_street && tourBooking.shipping_city && tourBooking.shipping_postal_code) {
                        shippingAddress = {
                          fullName: tourBooking.shipping_full_name || null,
                          street: tourBooking.shipping_street,
                          city: tourBooking.shipping_city,
                          postalCode: tourBooking.shipping_postal_code,
                          country: tourBooking.shipping_country || 'BE',
                        };
                        console.info('[Stoqflow] Found shipping address in tourbooking table:', shippingAddress);
                      } 
                      // Fallback: check invitee data
                      else if (tourBooking.invitees && Array.isArray(tourBooking.invitees)) {
                        const matchingInvitee = tourBooking.invitees.find((inv: any) => 
                          inv.email && inv.email.toLowerCase() === (bookingData.customerEmail || '').toLowerCase()
                        );
                        
                        if (matchingInvitee?.shippingAddress) {
                          shippingAddress = matchingInvitee.shippingAddress;
                          console.info('[Stoqflow] Found shipping address in tourbooking invitee:', shippingAddress);
                        }
                      }
                    }
                  } catch (err) {
                    console.warn('[Stoqflow] Error fetching shipping address from tourbooking:', err);
                  }

                  // Second try: for local stories, also check local_tours_bookings
                  if (!shippingAddress && tourType === 'local_stories') {
                    console.info('[Stoqflow] Shipping address not found in tourbooking, checking local_tours_bookings...');
                    try {
                      const { data: localBooking } = await supabase
                        .from('local_tours_bookings')
                        .select('shipping_full_name, shipping_street, shipping_city, shipping_postal_code, shipping_country')
                        .eq('booking_id', createdBookingId)
                        .eq('stripe_session_id', sessionId)
                        .maybeSingle();
                      
                      if (localBooking && localBooking.shipping_street && localBooking.shipping_city && localBooking.shipping_postal_code) {
                        shippingAddress = {
                          fullName: localBooking.shipping_full_name || null,
                          street: localBooking.shipping_street,
                          city: localBooking.shipping_city,
                          postalCode: localBooking.shipping_postal_code,
                          country: localBooking.shipping_country || 'BE',
                        };
                        console.info('[Stoqflow] Found shipping address in local_tours_bookings:', shippingAddress);
                      }
                    } catch (err) {
                      console.warn('[Stoqflow] Error fetching shipping address from local_tours_bookings:', err);
                    }
                  }
                }
                
                let hasValidAddress = false;
                
                // Check if shippingAddress exists and has required fields
                if (shippingAddress && typeof shippingAddress === 'object') {
                  const street = shippingAddress.street || shippingAddress.address_1 || '';
                  const city = shippingAddress.city || '';
                  const postalCode = shippingAddress.postalCode || shippingAddress.postal_code || '';
                  
                  if (street && city && postalCode) {
                    // Use shipping address from bookingData or local_tours_bookings (form data filled by user)
                    clientInfo.name = shippingAddress.fullName || bookingData.customerName || 'Guest';
                    clientInfo.address_1 = street.trim();
                    clientInfo.address_2 = (shippingAddress.street2 || shippingAddress.address_2 || '').trim();
                    clientInfo.city = city.trim();
                    clientInfo.postal_code = postalCode.trim();
                    // Normalize country to ISO code (Stoqflow requires ISO codes like "BE", not "België")
                    clientInfo.country = normalizeCountryCode(shippingAddress.country);
                    hasValidAddress = true;
                    
                    console.info('[Stoqflow] Using shipping address:', {
                      source: shippingAddress.street ? 'bookingData/local_tours_bookings' : 'unknown',
                      name: clientInfo.name,
                      address_1: clientInfo.address_1,
                      city: clientInfo.city,
                      postal_code: clientInfo.postal_code,
                      country: clientInfo.country,
                    });
                  } else {
                    console.warn('[Stoqflow] Shipping address exists but missing required fields:', {
                      hasStreet: !!street,
                      hasCity: !!city,
                      hasPostalCode: !!postalCode,
                      shippingAddress,
                    });
                  }
                } else {
                  // Fallback: try to get from session shipping address
                  console.warn('[Stoqflow] Shipping address missing or incomplete, checking Stripe session...');
                  
                  // Try to get shipping address from Stripe session
                  let sessionShippingAddress: Stripe.Address | null = null;
                  let sessionShippingName: string | null = null;
                  try {
                    const sessionData = await stripe.checkout.sessions.retrieve(sessionId);
                    if (sessionData.shipping_details?.address) {
                      sessionShippingAddress = sessionData.shipping_details.address;
                      sessionShippingName = sessionData.shipping_details.name || null;
                      console.info('[Stoqflow] Found shipping address in Stripe session');
                    }
                  } catch (err) {
                    console.warn('[Stoqflow] Could not retrieve session:', err);
                  }
                  
                  if (sessionShippingAddress && sessionShippingAddress.line1 && sessionShippingAddress.city && sessionShippingAddress.postal_code) {
                    clientInfo.name = sessionShippingName || bookingData.customerName || 'Guest';
                    clientInfo.address_1 = sessionShippingAddress.line1;
                    clientInfo.address_2 = sessionShippingAddress.line2 || '';
                    clientInfo.city = sessionShippingAddress.city;
                    clientInfo.postal_code = sessionShippingAddress.postal_code;
                    // Normalize country to ISO code (Stoqflow requires ISO codes)
                    clientInfo.country = normalizeCountryCode(sessionShippingAddress.country);
                    hasValidAddress = true;
                    
                    console.info('[Stoqflow] Using shipping address from Stripe session:', {
                      name: clientInfo.name,
                      address_1: clientInfo.address_1,
                      city: clientInfo.city,
                      postal_code: clientInfo.postal_code,
                      country: clientInfo.country,
                    });
                  }
                }
                
                // Validate that we have required address fields
                if (!hasValidAddress || !clientInfo.address_1 || !clientInfo.city || !clientInfo.postal_code) {
                  console.error('[Stoqflow] Missing required shipping address fields. Cannot create Stoqflow order.', {
                    hasValidAddress,
                    hasAddress1: !!clientInfo.address_1,
                    hasCity: !!clientInfo.city,
                    hasPostalCode: !!clientInfo.postal_code,
                    clientInfo,
                  });
                  // Skip order creation if address is missing
                } else {
                  clientInfo.email = bookingData.customerEmail || '';
                  
                  console.info('[Stoqflow] Prepared client_info:', {
                    name: clientInfo.name,
                    address_1: clientInfo.address_1,
                    city: clientInfo.city,
                    postal_code: clientInfo.postal_code,
                    country: clientInfo.country,
                    email: clientInfo.email,
                  });

                  // Prepare notes (max 500 characters according to API)
                  const notesText = `Tour Booking: ${sessionId} | Booking ID: ${createdBookingId} | Customer: ${bookingData.customerEmail}`;
                  const notes = notesText.length > 500 ? notesText.substring(0, 497) + '...' : notesText;

                  // Create order payload according to Stoqflow API v2 documentation
                  const stoqflowPayload: any = {
                    shop_id: stoqflowShopId, // Required
                    order_items: validOrderItems, // Use only items with product_id
                    status: 'ready-to-pick', // Payment already completed
                    type_of_goods: 'commercial-goods',
                    origin: {
                      id: sessionId, // Stripe checkout session ID
                      number: createdBookingId.toString(), // Booking ID reference
                    },
                    notes: notes,
                  };

                  // Client handling: if client_id provided, use it; otherwise use client_info
                  const stoqflowOrderClientId = Deno.env.get('STOQFLOW_ORDER_CLIENT_ID');
                  if (stoqflowOrderClientId) {
                    stoqflowPayload.client_id = stoqflowOrderClientId;
                  } else {
                    stoqflowPayload.client_info = clientInfo;
                  }

                  // Validate payload before sending
                  if (!stoqflowShopId) {
                    throw new Error('STOQFLOW_SHOP_ID is required but not set');
                  }
                  if (!Array.isArray(validOrderItems) || validOrderItems.length === 0) {
                    throw new Error('order_items must be a non-empty array with product_id');
                  }
                  
                  // Validate all items have product_id
                  const itemsWithoutProductId = validOrderItems.filter((item: any) => !item.product_id);
                  if (itemsWithoutProductId.length > 0) {
                    throw new Error(`Found ${itemsWithoutProductId.length} items without product_id`);
                  }

                  console.info('[Stoqflow] Creating order with payload:', {
                    shop_id: stoqflowShopId,
                    item_count: validOrderItems.length,
                    items_with_product_id: validOrderItems.filter((item: any) => item.product_id).length,
                    status: stoqflowPayload.status,
                    booking_id: createdBookingId,
                    has_client_info: !!stoqflowPayload.client_info,
                    has_client_id: !!stoqflowPayload.client_id,
                  });

                const stoqflowRes = await fetch(`${apiBaseUrl}/orders`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuth}`,
                  },
                  body: JSON.stringify(stoqflowPayload),
                });

                if (stoqflowRes.ok) {
                  const stoqflowData = await stoqflowRes.json();
                  stoqflowOrderId = stoqflowData._id;
                  console.info('[Stoqflow] Order created successfully for tour booking upsell products:', {
                    stoqflow_order_id: stoqflowOrderId,
                    session_id: sessionId,
                    booking_id: createdBookingId,
                  });
                } else {
                  const errorText = await stoqflowRes.text();
                  let errorMessage = errorText;
                  try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorText;
                  } catch {
                    // Keep original error text if not JSON
                  }

                  console.error('[Stoqflow] ❌ Failed to create order for tour booking upsell products:', {
                    status: stoqflowRes.status,
                    statusText: stoqflowRes.statusText,
                    error: errorMessage,
                    session_id: sessionId,
                    booking_id: createdBookingId,
                  });
                }
                }
              }
            } else {
              console.warn('[Stoqflow] Missing environment variables, skipping Stoqflow order creation for tour booking upsell products', {
                hasClientId: !!stoqflowClientId,
                hasClientSecret: !!stoqflowClientSecret,
                hasShopId: !!stoqflowShopId,
                hasBaseUrl: !!stoqflowBaseUrl,
              });
            }
          } catch (err: any) {
            console.error('[Stoqflow] Error creating order for tour booking upsell products:', {
              error: err.message,
              error_type: err?.constructor?.name,
              session_id: sessionId,
              booking_id: createdBookingId,
            });
            // Don't fail the booking if Stoqflow fails - booking is already created
          }
        }

        // Call N8N webhook for tour booking confirmation
        const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';

        // Ensure createdBookingId is set before creating payload
        if (!createdBookingId) {
          console.error('[CRITICAL ERROR] createdBookingId is null when trying to call N8N webhook!', {
            tourType,
            sessionId,
            bookingDataTourId: bookingData?.tourId,
            customerEmail: bookingData?.customerEmail,
          });
          throw new Error('Booking ID is null - cannot proceed with webhook call');
        }

        const payload = {
          ...session,
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
            booking_id: createdBookingId, // Ensure this is always a number, not null
            stoqflow_order_id: stoqflowOrderId || null, // Include Stoqflow order ID if created
          },
          bookingData, // Include full booking data
          // Include promo code info for invoice creation
          promoCode: promoCodeInfo.code,
          promoDiscountAmount: promoCodeInfo.discountAmount,
          promoDiscountPercent: promoCodeInfo.discountPercent,
        };

        // Log payload to verify booking_id is included
        console.info('[N8N] Payload being sent to webhook:', {
          hasBookingId: !!payload.metadata.booking_id,
          bookingId: payload.metadata.booking_id,
          bookingIdType: typeof payload.metadata.booking_id,
          sessionId: payload.metadata.stripe_session_id,
        });

        try {
          console.info('[N8N] Calling tour booking webhook', {
            url: n8nWebhookUrl,
            sessionId,
            tourType,
            bookingId: createdBookingId,
          });

          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.info('[N8N] Tour booking webhook response', {
            status: res.status,
            ok: res.ok,
            bookingId: createdBookingId,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error('[N8N] Tour booking webhook error body', text);
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.error('[N8N] Webhook call timed out after 30 seconds');
          } else {
            console.error('[N8N] Failed to call tour booking webhook', err);
          }
        }

        } catch (bookingError) {
          console.error('Error processing tour booking:', bookingError);
          console.error('Booking data that caused error:', JSON.stringify({
            tourId: bookingData?.tourId,
            tourType,
            sessionId,
          }));
          
          // Delete pending booking if booking was created successfully (even if there was an error later)
          if (createdBookingId) {
            await supabase.from('pending_tour_bookings').delete().eq('id', pendingBooking.id);
            console.info(`Deleted pending booking entry after error (booking ${createdBookingId} was created)`);
          }
          
          // Still call webhook even if booking creation failed (so n8n can handle the error)
          const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';
          const errorPayload = {
            ...session,
            metadata: {
              ...metadata,
              stripe_session_id: sessionId,
              booking_id: createdBookingId || null,
              bookingError: true,
              errorMessage: bookingError instanceof Error ? bookingError.message : String(bookingError),
            },
            bookingData,
            promoCode: promoCodeInfo.code,
            promoDiscountAmount: promoCodeInfo.discountAmount,
            promoDiscountPercent: promoCodeInfo.discountPercent,
          };
          
          try {
            console.info('[N8N] Calling tour booking webhook after error', {
              url: n8nWebhookUrl,
              sessionId,
              hasBookingId: !!createdBookingId,
            });
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const res = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(errorPayload),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            console.info('[N8N] Error webhook response', {
              status: res.status,
              ok: res.ok,
            });
            
            if (!res.ok) {
              const text = await res.text();
              console.error('[N8N] Error webhook error body', text);
            }
          } catch (webhookErr) {
            if (webhookErr instanceof Error && webhookErr.name === 'AbortError') {
              console.error('[N8N] Webhook call timed out after 30 seconds');
            } else {
              console.error('[N8N] Failed to call tour booking webhook after error', webhookErr);
            }
          }
          
          // Don't delete pending booking if booking creation failed (so we can retry/investigate)
          // But if booking was created, we already deleted it above
          return;
        }

        return; // Done processing tour booking
      }

      // If no pending tour booking, check for legacy bookings (backwards compatibility)
      // This handles any bookings created before the refactor
      const { data: existingBooking } = await supabase
        .from('tourbooking')
        .select('id, status, tour_id, booking_type')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (existingBooking) {
        // Legacy booking exists - just update status
        const newStatus = existingBooking.booking_type === 'B2B' ? 'quote_paid' : 'payment_completed';

        // Check if already processed (idempotency) - skip if status already matches
        if (existingBooking.status === newStatus) {
          console.info(`Legacy booking ${existingBooking.id} already has status ${newStatus}, skipping duplicate processing`);
          return;
        }

        await supabase
          .from('tourbooking')
          .update({ status: newStatus })
          .eq('id', existingBooking.id);
        console.info(`Updated legacy booking ${existingBooking.id} to status ${newStatus}`);

        // Call N8N webhook (only for actual status updates, not duplicate events)
        const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';
        try {
          console.info('[N8N] Calling tour booking webhook for legacy booking', {
            url: n8nWebhookUrl,
            sessionId,
            bookingId: existingBooking.id,
          });
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...session, metadata: { ...metadata, stripe_session_id: sessionId } }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.info('[N8N] Legacy booking webhook response', {
            status: res.status,
            ok: res.ok,
          });
          
          if (!res.ok) {
            const text = await res.text();
            console.error('[N8N] Legacy booking webhook error body', text);
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.error('[N8N] Webhook call timed out after 30 seconds');
          } else {
            console.error('[N8N] Failed to call tour booking webhook for legacy booking', err);
          }
        }

        return;
      }

      // Check if this is a manual payment from admin panel
      if (metadata?.isManualPaymentLink === 'true' && metadata?.bookingId) {
        console.info(`Processing manual payment for booking ${metadata.bookingId}, session ${sessionId}`);

        const bookingId = parseInt(metadata.bookingId, 10);
        const customerEmail = session.customer_email;
        const amountPaid = (session.amount_total || 0) / 100; // Convert from cents to euros
        const localBookingId = metadata.localBookingId || null;

        // Fetch the booking with full details
        const { data: booking, error: bookingError } = await supabase
          .from('tourbooking')
          .select('id, invitees, tour_id, tour_datetime, tour_end, city, request_tanguy, user_id, status')
          .eq('id', bookingId)
          .single();

        if (bookingError || !booking) {
          console.error(`Manual payment: Booking ${bookingId} not found`, bookingError);
          return;
        }

        // Fetch tour info for the booking data
        let tour: any = null;
        if (booking.tour_id) {
          const { data: tourData } = await supabase
            .from('tours_table_prod')
            .select('id, title_nl, title_en, price, duration_minutes, local_stories, city')
            .eq('id', booking.tour_id)
            .single();
          if (tourData) tour = tourData;
        }

        // Find the invitee that matches the customer email
        const invitees = (booking.invitees as any[]) || [];
        const matchingInvitee = invitees.find((inv: any) => inv.email === customerEmail);

        // Update the invitee's amount and clear pending payment fields
        const updatedInvitees = invitees.map((inv: any) => {
          if (inv.email === customerEmail) {
            // Remove pending payment tracking since payment is complete
            const { pendingPaymentPeople, pendingPaymentAmount, ...rest } = inv;
            return {
              ...rest,
              amount: (rest.amount || 0) + amountPaid, // Add to existing amount (for additional people payments)
              isPaid: true,
            };
          }
          return inv;
        });

        // Update tourbooking with new invitee data and stripe_session_id
        const { error: updateError } = await supabase
          .from('tourbooking')
          .update({
            invitees: updatedInvitees,
            stripe_session_id: sessionId, // Store the payment session ID
            status: 'payment_completed', // Update status to reflect payment
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error(`Manual payment: Failed to update booking ${bookingId}`, updateError);
        } else {
          console.info(`Manual payment: Updated booking ${bookingId} with stripe_session_id ${sessionId} and payment status`);
        }

        // If this is a Local Stories booking, also update the local_tours_bookings entry
        if (localBookingId) {
          // First fetch the current local booking to get existing payments array
          const { data: localBooking } = await supabase
            .from('local_tours_bookings')
            .select('extra_payments_received, pending_payment_people, pending_payment_amount')
            .eq('id', localBookingId)
            .single();

          // Build the new payment log entry
          const paymentLogEntry = {
            // Convert Brussels time to UTC for database storage
            paidAt: new Date(nowBrussels()).toISOString(),
            amount: amountPaid,
            numberOfPeople: parseInt(metadata.numberOfPeople || '1', 10),
            stripeSessionId: sessionId,
            type: metadata.isExtraInvitees === 'true' ? 'extra_people' : 'manual',
          };

          // Append to existing payments array
          const existingPayments = (localBooking?.extra_payments_received as any[]) || [];
          const updatedPayments = [...existingPayments, paymentLogEntry];

          const { error: localUpdateError } = await supabase
            .from('local_tours_bookings')
            .update({
              stripe_session_id: sessionId,
              // Clear pending payment fields since payment is complete
              pending_payment_people: null,
              pending_payment_amount: null,
              // Log the payment
              extra_payments_received: updatedPayments,
            })
            .eq('id', localBookingId);

          if (localUpdateError) {
            console.error(`Manual payment: Failed to update local_tours_bookings ${localBookingId}`, localUpdateError);
          } else {
            console.info(`Manual payment: Updated local_tours_bookings ${localBookingId} - cleared pending payment, logged payment of €${amountPaid}`);
          }
        }

        // Reconstruct bookingData to match normal booking format
        const tourTitle = tour?.title_nl || tour?.title_en || 'Tour';
        const tourPrice = tour?.price || 0;
        const numberOfPeople = matchingInvitee?.numberOfPeople || parseInt(metadata.numberOfPeople || '1', 10);
        const isLocalStories = tour?.local_stories === true;

        // Calculate duration
        let durationMinutes = tour?.duration_minutes || 120;
        if (matchingInvitee?.extraHour || matchingInvitee?.extraHourCost > 0) {
          durationMinutes += 60;
        }

        // Check if this is an extra invitees payment (adding people to existing booking)
        const isExtraInvitees = metadata.isExtraInvitees === 'true';

        // Reconstruct bookingData object to match normal booking format
        const bookingData = {
          tourId: booking.tour_id,
          tourTitle: tourTitle,
          tourPrice: tourPrice,
          isLocalStories: isLocalStories,
          isOpMaat: matchingInvitee?.opMaatAnswers ? true : false,

          customerName: matchingInvitee?.name || metadata.customerName || 'Customer',
          customerEmail: customerEmail,
          customerPhone: matchingInvitee?.phone || null,
          userId: booking.user_id || null,

          bookingDate: booking.tour_datetime ? booking.tour_datetime.split('T')[0] : null,
          bookingTime: booking.tour_datetime ? booking.tour_datetime.split('T')[1]?.substring(0, 5) : null,
          bookingDateTime: booking.tour_datetime || null,
          tourDatetime: booking.tour_datetime,
          tourEndDatetime: booking.tour_end,
          durationMinutes: durationMinutes,

          numberOfPeople: numberOfPeople,
          language: matchingInvitee?.language || 'nl',
          specialRequests: matchingInvitee?.specialRequests || null,
          requestTanguy: matchingInvitee?.requestTanguy || booking.request_tanguy || false,
          extraHour: matchingInvitee?.extraHour || matchingInvitee?.extraHourCost > 0 || false,

          citySlug: booking.city || tour?.city || null,

          opMaatAnswers: matchingInvitee?.opMaatAnswers || null,
          upsellProducts: matchingInvitee?.upsellProducts || [],

          amounts: {
            tourFullPrice: matchingInvitee?.originalAmount || (tourPrice * numberOfPeople),
            discountAmount: matchingInvitee?.discountApplied || 0,
            tourFinalAmount: matchingInvitee?.amount || amountPaid,
            tanguyCost: matchingInvitee?.tanguyCost || 0,
            extraHourCost: matchingInvitee?.extraHourCost || 0,
            weekendFeeCost: matchingInvitee?.weekendFeeCost || 0,
            eveningFeeCost: matchingInvitee?.eveningFeeCost || 0,
          },

          // Mark this as a manual payment for n8n to identify
          isManualPaymentLink: true,
          isExtraInvitees: isExtraInvitees,
        };

        // Use the unified webhook URL for all payment link payments
        const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/86e54c79-f11d-4f1e-90f2-08a8f4665b40';

        // Fetch full payment intent details for additional data
        let paymentIntentData: any = null;
        if (fullSession.payment_intent) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              typeof fullSession.payment_intent === 'string' 
                ? fullSession.payment_intent 
                : fullSession.payment_intent.id,
              { expand: ['charges.data.balance_transaction'] }
            );
            paymentIntentData = paymentIntent;
          } catch (err) {
            console.warn('Failed to retrieve payment intent:', err);
          }
        }

        // Fetch local booking data if applicable (fetch full record, not just payment fields)
        let localBookingData: any = null;
        if (localBookingId) {
          const { data: localBooking } = await supabase
            .from('local_tours_bookings')
            .select('*')
            .eq('id', localBookingId)
            .single();
          if (localBooking) {
            localBookingData = localBooking;
          }
        }

        // Build comprehensive payload with all available data
        const payload = {
          // Stripe session data
          stripeSession: {
            id: sessionId,
            mode: fullSession.mode,
            payment_status: fullSession.payment_status,
            status: fullSession.status,
            amount_total: fullSession.amount_total,
            amount_subtotal: fullSession.amount_subtotal,
            currency: fullSession.currency,
            customer_email: fullSession.customer_email,
            customer: fullSession.customer,
            payment_intent: fullSession.payment_intent,
            created: fullSession.created,
            expires_at: fullSession.expires_at,
            success_url: fullSession.success_url,
            cancel_url: fullSession.cancel_url,
            url: fullSession.url,
            line_items: fullSession.line_items,
            total_details: fullSession.total_details,
            discounts: fullSession.discounts,
          },
          
          // Payment intent details (if available)
          paymentIntent: paymentIntentData,
          
          // Metadata
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
            booking_id: bookingId,
            extra_invitees: isExtraInvitees,
            local_booking_id: localBookingId || null,
          },
          
          // Booking data (formatted for consistency)
          bookingData,
          
          // Full booking object from database
          booking: {
            id: booking.id,
            tour_id: booking.tour_id,
            tour_datetime: booking.tour_datetime,
            tour_end: booking.tour_end,
            city: booking.city,
            request_tanguy: booking.request_tanguy,
            user_id: booking.user_id,
            status: booking.status,
            invitees: booking.invitees,
          },
          
          // Full tour object
          tour: tour ? {
            id: tour.id,
            title_nl: tour.title_nl,
            title_en: tour.title_en,
            price: tour.price,
            duration_minutes: tour.duration_minutes,
            local_stories: tour.local_stories,
            city: tour.city,
          } : null,
          
          // Matching invitee data
          invitee: matchingInvitee ? {
            name: matchingInvitee.name,
            email: matchingInvitee.email,
            phone: matchingInvitee.phone,
            numberOfPeople: matchingInvitee.numberOfPeople,
            language: matchingInvitee.language,
            contactLanguage: matchingInvitee.contactLanguage,
            specialRequests: matchingInvitee.specialRequests,
            amount: matchingInvitee.amount,
            currency: matchingInvitee.currency,
            requestTanguy: matchingInvitee.requestTanguy,
            hasExtraHour: matchingInvitee.hasExtraHour,
            weekendFee: matchingInvitee.weekendFee,
            eveningFee: matchingInvitee.eveningFee,
            tanguyCost: matchingInvitee.tanguyCost,
            extraHourCost: matchingInvitee.extraHourCost,
            weekendFeeCost: matchingInvitee.weekendFeeCost,
            eveningFeeCost: matchingInvitee.eveningFeeCost,
            originalAmount: matchingInvitee.originalAmount,
            discountApplied: matchingInvitee.discountApplied,
            promoCode: matchingInvitee.promoCode,
            promoDiscountAmount: matchingInvitee.promoDiscountAmount,
            promoDiscountPercent: matchingInvitee.promoDiscountPercent,
            opMaatAnswers: matchingInvitee.opMaatAnswers,
            upsellProducts: matchingInvitee.upsellProducts,
          } : null,
          
          // Local booking data (if applicable)
          localBooking: localBookingData,
          
          // Payment details
          paymentDetails: {
            amountPaid: amountPaid,
            numberOfPeople: numberOfPeople,
            isExtraInvitees: isExtraInvitees,
            isManualPaymentLink: true,
            paymentDate: new Date().toISOString(),
          },
          
          // Promo code info
          promoCode: promoCodeInfo.code,
          promoDiscountAmount: promoCodeInfo.discountAmount,
          promoDiscountPercent: promoCodeInfo.discountPercent,
        };

        try {
          console.info('[N8N] Calling tour booking webhook for manual payment', {
            url: n8nWebhookUrl,
            sessionId,
            bookingId,
            isExtraInvitees,
          });

          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.info('[N8N] Manual payment webhook response', {
            status: res.status,
            ok: res.ok,
            isExtraInvitees,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error('[N8N] Manual payment webhook error body', text);
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.error('[N8N] Webhook call timed out after 30 seconds');
          } else {
            console.error('[N8N] Failed to call tour booking webhook for manual payment', err);
          }
        }

        return;
      }

      // Check if this is a lecture payment from admin panel
      if (metadata?.isLecturePayment === 'true' && metadata?.bookingId) {
        console.info(`Processing lecture payment for booking ${metadata.bookingId}, session ${sessionId}`);

        const bookingId = metadata.bookingId;
        const amountPaid = (session.amount_total || 0) / 100; // Convert from cents to euros
        // Fetch the lecture booking with lecture details to get all customer info
        const { data: lectureBooking, error: fetchError } = await supabase
          .from('lecture_bookings')
          .select('*, lectures(title)')
          .eq('id', bookingId)
          .single();

        if (fetchError || !lectureBooking) {
          console.error(`Lecture payment: Failed to fetch booking ${bookingId}`, fetchError);
          return;
        }

        // Use data from the database (more reliable than metadata)
        // Column names: name, phone, email, number_of_people
        const customerEmail = lectureBooking.email || session.customer_email;
        const customerName = lectureBooking.name || metadata.customerName || 'Customer';
        const customerPhone = lectureBooking.phone || null;
        const lectureName = (lectureBooking.lectures as any)?.title || metadata.lectureName || 'Lecture';
        const numberOfPeople = lectureBooking.number_of_people || parseInt(metadata.numberOfPeople || '1', 10);

        // Update lecture_bookings status to confirmed
        const { error: updateError } = await supabase
          .from('lecture_bookings')
          .update({
            status: 'confirmed',
            // Convert Brussels time to UTC for database storage
            updated_at: new Date(nowBrussels()).toISOString(),
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error(`Lecture payment: Failed to update booking ${bookingId}`, updateError);
        } else {
          console.info(`Lecture payment: Updated booking ${bookingId} status to confirmed`);
        }

        // Call N8N webhook to send lecture payment confirmation
        const n8nLecturePaymentConfirmationWebhook = 'https://alexfinit.app.n8n.cloud/webhook/lecture-payment-completed';

        try {
          console.info('[N8N] Calling lecture payment confirmation webhook');

          const res = await fetch(n8nLecturePaymentConfirmationWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              customerEmail,
              customerName,
              customerPhone,
              lectureName,
              numberOfPeople,
              amountPaid,
              stripeSessionId: sessionId,
              paymentStatus: 'completed',
              // Convert Brussels time to UTC for database storage
              paidAt: new Date(nowBrussels()).toISOString(),
            }),
          });

          console.info('[N8N] Lecture payment webhook response', {
            status: res.status,
            ok: res.ok,
          });
        } catch (err) {
          console.error('[N8N] Failed to call lecture payment confirmation webhook', err);
        }

        return;
      }

      // If no tour booking found (no pending and no legacy), check if this is a webshop order (via metadata)
      // IMPORTANT: Only process as webshop if order_type is explicitly 'webshop' AND it's not a tour booking
      console.info(`[Webshop Check] Checking for webshop order. Metadata:`, JSON.stringify(metadata || {}));
      console.info(`[Webshop Check] Session mode: ${mode}, Payment status: ${payment_status}`);

      // If this has tourId in metadata, it's a tour booking - don't process as webshop
      if (metadata?.tourId) {
        console.error(`Tour booking (tourId: ${metadata.tourId}) could not be processed - no pending or legacy booking found. Check pending_tour_bookings table exists.`);
        return;
      }

      // Process webshop or giftcard orders (both should create orders in database)
      const orderType = metadata?.order_type;
      const isWebshopOrder = orderType === 'webshop' || orderType === 'giftcard';
      
      console.info(`[Webshop Check] order_type: ${orderType}, isWebshopOrder: ${isWebshopOrder}`);
      
      if (isWebshopOrder) {
        console.info(`✅ Processing ${orderType} order for session: ${sessionId}`);

        // Retrieve full session with line items, shipping details, and discounts
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items', 'line_items.data.price.product', 'discounts.promotion_code', 'discounts.promotion_code.coupon', 'discounts.coupon'],
        });

        // Extract promo code and gift card discount info for webshop orders
        let webshopPromoCode: string | null = null;
        let webshopPromoDiscountPercent: number | null = null;
        let giftCardDiscountFromCoupon: number | null = null;
        let giftCardCodeFromCoupon: string | null = null;

        if (fullSession.discounts && fullSession.discounts.length > 0) {
          const discount = fullSession.discounts[0] as any;
          
          // Check if it's a promotion code (promo code discount)
          if (discount.promotion_code && typeof discount.promotion_code === 'object') {
            webshopPromoCode = discount.promotion_code.code || null;
            // Get discount percent from coupon inside promotion_code
            if (discount.promotion_code.coupon) {
              webshopPromoDiscountPercent = discount.promotion_code.coupon.percent_off || null;
            }
          }
          
          // Check if it's a gift card discount (coupon with gift card metadata)
          if (discount.coupon && typeof discount.coupon === 'object') {
            const coupon = discount.coupon;
            // Check metadata to see if this is a gift card discount
            if (coupon.metadata && coupon.metadata.type === 'gift_card_discount') {
              giftCardCodeFromCoupon = coupon.metadata.gift_card_code || null;
              // Get discount amount (could be amount_off or percent_off)
              if (coupon.amount_off) {
                giftCardDiscountFromCoupon = coupon.amount_off / 100; // Convert cents to euros
              } else if (coupon.percent_off) {
                // For percentage discounts, we'd need to calculate from the total
                // But gift cards use fixed amounts, so this shouldn't happen
                console.warn('Gift card discount uses percentage instead of fixed amount');
              }
            }
          }
        }
        
        // Use gift card discount from coupon if available, otherwise fall back to metadata
        const giftCardDiscountAmount = giftCardDiscountFromCoupon ?? 
          (metadata?.giftCardDiscount ? parseFloat(metadata.giftCardDiscount) : 0);
        const giftCardCodeUsed = giftCardCodeFromCoupon || metadata?.giftCardCode || null;
        
        console.info('Webshop discount info:', { 
          webshopPromoCode, 
          webshopPromoDiscountPercent,
          giftCardCode: giftCardCodeUsed,
          giftCardDiscount: giftCardDiscountAmount,
        });

        // Extract items from line items
        let shippingCost = 0;
        const shippingItems: any[] = [];
        const productItems: any[] = [];

        // Parse product IDs from metadata (passed from create-webshop-checkout)
        let productIds: string[] = [];
        try {
          if (metadata?.productIds) {
            productIds = JSON.parse(metadata.productIds);
            console.info('Parsed product IDs from metadata:', productIds);
          }
        } catch (e) {
          console.warn('Failed to parse productIds from metadata:', e);
        }

        let productIndex = 0; // Track index for matching with productIds

        if (fullSession.line_items?.data) {
          for (const item of fullSession.line_items.data) {
            // Extract item name from different possible locations
            let itemName = '';

            // Try description first
            if (item.description) {
              itemName = item.description;
            }
            // Try price.product (for existing Stripe products)
            else if (item.price && typeof item.price === 'object' && 'product' in item.price) {
              const product = item.price.product;
              if (typeof product === 'object' && product && 'name' in product) {
                itemName = product.name as string;
              }
            }

            const itemNameStr = typeof itemName === 'string' ? itemName : '';

            if (itemNameStr.toLowerCase().includes('verzendkosten') ||
                itemNameStr.toLowerCase().includes('shipping') ||
                itemNameStr.toLowerCase().includes('freight')) {
              // Use amount_subtotal for shipping (original price, never discounted)
              const shippingPrice = (item.amount_subtotal ?? item.amount_total ?? 0) / 100;
              shippingCost += shippingPrice;
              shippingItems.push({
                title: itemNameStr,
                quantity: item.quantity ?? 1,
                price: shippingPrice,
              });
            } else {
              // Calculate unit price (amount_total is already the line total, so divide by quantity)
              const quantity = item.quantity ?? 1;
              const unitPrice = ((item.amount_subtotal ?? item.amount_total ?? 0) / 100) / quantity;
              
              // Extract Stripe product ID from line item
              let stripeProductId: string | null = null;
              if (item.price && typeof item.price === 'object' && 'product' in item.price) {
                const product = item.price.product;
                if (typeof product === 'string') {
                  stripeProductId = product;
                } else if (typeof product === 'object' && product && 'id' in product) {
                  stripeProductId = product.id as string;
                }
              }
              
              productItems.push({
                title: itemNameStr || 'Product',
                quantity: quantity,
                price: unitPrice,
                productId: productIds[productIndex] || stripeProductId || null, // Prefer metadata productId, fallback to Stripe product ID
                stripeProductId: stripeProductId, // Also store Stripe product ID separately
              });
              productIndex++;
            }
          }
        }

        // If shipping not found in line items, try to get it from Stripe's shipping details
        if (shippingCost === 0) {
          // Check if Stripe has shipping in total_details (when using Stripe's shipping rates)
          const stripeShippingAmount = (fullSession as any).total_details?.amount_shipping ?? 0;
          if (stripeShippingAmount > 0) {
            shippingCost = stripeShippingAmount / 100;
          }
        }

        // Get shipping address from Stripe session
        const stripeShipping = fullSession.shipping_details;
        const shippingAddress = stripeShipping ? {
          name: stripeShipping.name || '',
          street: stripeShipping.address?.line1 || '',
          street2: stripeShipping.address?.line2 || '',
          city: stripeShipping.address?.city || '',
          postalCode: stripeShipping.address?.postal_code || '',
          country: stripeShipping.address?.country || '',
        } : null;

        // Create the order in database
        const paymentIntentId = typeof fullSession.payment_intent === 'string'
          ? fullSession.payment_intent
          : fullSession.payment_intent?.id || `pi_${sessionId}`;
        
        const customerId = typeof fullSession.customer === 'string'
          ? fullSession.customer
          : fullSession.customer?.id || `guest_${sessionId}`;

        // Ensure shipping_address is never null (required by database)
        // Use empty object if no shipping address provided (e.g., gift cards)
        const shippingAddressForDb = shippingAddress || {
          name: metadata?.customerName || 'Guest',
          street: '',
          street2: '',
          city: '',
          postalCode: '',
          country: 'BE',
        };

        // Prepare order data according to actual database schema
        // Required fields: payment_intent_id, customer_id, amount_subtotal, amount_total (all NOT NULL)
        const orderInsert = {
          checkout_session_id: sessionId,
          payment_intent_id: paymentIntentId, // Required NOT NULL
          stripe_payment_intent_id: paymentIntentId, // Also set this (optional field)
          customer_id: customerId, // Required NOT NULL
          amount_subtotal: fullSession.amount_subtotal || 0, // Required NOT NULL (in cents)
          amount_total: fullSession.amount_total || 0, // Required NOT NULL (in cents)
          currency: fullSession.currency || 'eur', // Required NOT NULL
          payment_status: fullSession.payment_status || 'paid', // Required NOT NULL
          status: 'completed',
          total_amount: (fullSession.amount_total || 0) / 100, // In euros (optional field)
          customer_name: metadata?.customerName || 'Guest',
          customer_email: fullSession.customer_email || metadata?.customerEmail || 'unknown@guest.com',
          shipping_address: shippingAddressForDb, // Required NOT NULL - use fallback if null
          billing_address: shippingAddressForDb, // Use shipping as billing
          items: [...productItems, ...shippingItems],
          metadata: {
            customerName: metadata?.customerName || 'Guest',
            customerEmail: fullSession.customer_email || metadata?.customerEmail || 'unknown@email.com',
            customerPhone: metadata?.customerPhone || '',
            userId: metadata?.userId && metadata.userId.trim() !== '' ? metadata.userId : null,
            shipping_cost: shippingCost,
            discount_amount: ((fullSession as any).total_details?.amount_discount ?? 0) / 100, // Discount in euros
            productIds: productIds, // Store product IDs for easy retrieval
            // Promo code info
            promoCode: webshopPromoCode,
            promoDiscountPercent: webshopPromoDiscountPercent,
          },
          user_id: metadata?.userId && metadata.userId.trim() !== '' ? metadata.userId : null,
        };

        // Validate required fields before inserting (according to database schema)
        if (!orderInsert.checkout_session_id) {
          console.error('❌ CRITICAL: checkout_session_id is missing!');
          return;
        }
        if (!orderInsert.payment_intent_id) {
          console.error('❌ CRITICAL: payment_intent_id is missing!');
          return;
        }
        if (!orderInsert.customer_id) {
          console.error('❌ CRITICAL: customer_id is missing!');
          return;
        }
        if (orderInsert.amount_subtotal === null || orderInsert.amount_subtotal === undefined) {
          console.error('❌ CRITICAL: amount_subtotal is missing!', { amount_subtotal: orderInsert.amount_subtotal });
          return;
        }
        if (orderInsert.amount_total === null || orderInsert.amount_total === undefined) {
          console.error('❌ CRITICAL: amount_total is missing!', { amount_total: orderInsert.amount_total });
          return;
        }
        if (!orderInsert.currency) {
          console.error('❌ CRITICAL: currency is missing!');
          return;
        }
        if (!orderInsert.payment_status) {
          console.error('❌ CRITICAL: payment_status is missing!');
          return;
        }
        if (!orderInsert.shipping_address) {
          console.error('❌ CRITICAL: shipping_address is missing!');
          return;
        }

        console.info('Inserting webshop order:', {
          checkout_session_id: orderInsert.checkout_session_id,
          payment_intent_id: orderInsert.payment_intent_id,
          customer_id: orderInsert.customer_id,
          amount_subtotal: orderInsert.amount_subtotal,
          amount_total: orderInsert.amount_total,
          currency: orderInsert.currency,
          payment_status: orderInsert.payment_status,
          total_amount: orderInsert.total_amount,
          customer_email: orderInsert.customer_email,
          item_count: orderInsert.items?.length || 0,
          has_shipping_address: !!orderInsert.shipping_address,
        });

        // Insert the order with retry logic (checkout no longer creates it due to NOT NULL constraints)
        let order: any = null;
        let orderError: any = null;
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          const { data, error } = await supabase
            .from('stripe_orders')
            .insert(orderInsert)
            .select()
            .single();

          if (error) {
            orderError = error;
            console.error(`[Attempt ${retryCount + 1}/${maxRetries}] Order insert error:`, {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
            
            // Check if it's a duplicate key error (order already exists)
            if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
              console.warn(`Order already exists for session ${sessionId}, fetching existing order...`);
              // Try to fetch the existing order
              const { data: existingOrder, error: fetchError } = await supabase
                .from('stripe_orders')
                .select('*')
                .eq('checkout_session_id', sessionId)
                .single();
              if (existingOrder) {
                order = existingOrder;
                orderError = null;
                console.info(`✅ Found existing order: ${existingOrder.id}`);
                break;
              } else if (fetchError) {
                console.error('Failed to fetch existing order:', fetchError);
              }
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = 1000 * retryCount; // 1s, 2s, 3s
              console.warn(`Order insert failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          } else {
            order = data;
            orderError = null;
            console.info(`✅ Order inserted successfully: ${order.id}`);
            break;
          }
        }

        // Variable to store Stoqflow order ID for N8N webhook
        let stoqflowOrderId: string | null = null;

        if (orderError) {
          console.error('❌ CRITICAL: Error creating webshop order after retries:', {
            error: orderError,
            error_message: orderError.message,
            error_code: orderError.code,
            error_details: orderError.details,
            session_id: sessionId,
            order_data: orderInsert,
            retries: retryCount,
          });
          // Don't continue if order creation failed - this is critical
          // The order must exist in database for the success page to work
          return;
        } else {
          console.info(`✅ Successfully created/found webshop order for session: ${sessionId}, order ID: ${order.id}`);

          // Redeem gift card if one was applied at checkout
          const giftCardCodeToRedeem = giftCardCodeUsed;
          if (giftCardCodeToRedeem && giftCardCodeToRedeem.trim() && giftCardDiscountAmount > 0 && orderType === 'webshop') {
            try {
              console.info(`[Gift Card Redemption] Processing redemption for code: ${giftCardCodeToRedeem}, discount amount: ${giftCardDiscountAmount} EUR`);
              
              // Redeem gift card directly (we're already in a service role context)
              const normalizedCode = giftCardCodeToRedeem.trim().toUpperCase().replace(/\s+/g, '');
              
              // Get the gift card
              const { data: giftCard, error: fetchError } = await supabase
                .from('gift_cards')
                .select('id, code, current_balance, status, expires_at')
                .eq('code', normalizedCode)
                .eq('status', 'active')
                .single();

              if (!fetchError && giftCard) {
                const currentBalance = parseFloat(giftCard.current_balance.toString());
                // Use the actual discount amount that was applied (not the order total)
                const amountToUse = Math.min(currentBalance, giftCardDiscountAmount);
                const newBalance = currentBalance - amountToUse;

                // Update gift card balance
                const { error: updateError } = await supabase
                  .from('gift_cards')
                  .update({
                    current_balance: newBalance,
                    last_used_at: new Date().toISOString(),
                    status: newBalance <= 0 ? 'redeemed' : 'active',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', giftCard.id)
                  .eq('current_balance', currentBalance); // Optimistic locking

                if (!updateError) {
                  // Record transaction
                  await supabase
                    .from('gift_card_transactions')
                    .insert({
                      gift_card_id: giftCard.id,
                      order_id: sessionId,
                      stripe_order_id: order.id,
                      amount_used: amountToUse,
                      balance_before: currentBalance,
                      balance_after: newBalance,
                      transaction_type: 'redemption',
                    });

                  console.info(`[Gift Card Redemption] Successfully redeemed: ${amountToUse} EUR, remaining balance: ${newBalance} EUR`);
                } else {
                  console.error(`[Gift Card Redemption] Failed to update gift card balance:`, updateError);
                }
              } else {
                console.error(`[Gift Card Redemption] Gift card not found or inactive:`, fetchError);
              }
            } catch (redeemError: any) {
              console.error('[Gift Card Redemption] Error redeeming gift card:', redeemError);
              // Don't fail the order - gift card redemption failure shouldn't block order completion
            }
          }

          // Create gift cards if this is a gift card order
          if (orderType === 'giftcard' && productItems.length > 0) {
            try {
              console.info('[Gift Card] Processing gift card creation for order');
              
              // Extract gift card items from productItems (items with isGiftCard flag or gift card category)
              const giftCardItems = productItems.filter((item: any) => {
                // Check if item is a gift card by checking productId against webshop_data
                // For now, we'll create gift cards for all items in a giftcard order
                return true; // All items in giftcard order are gift cards
              });

              if (giftCardItems.length > 0) {
                const purchaserEmail = fullSession.customer_email || metadata?.customerEmail || 'unknown@guest.com';
                const purchaserName = metadata?.customerName || 'Guest';

                for (const giftCardItem of giftCardItems) {
                  const amount = giftCardItem.price * giftCardItem.quantity;
                  
                  // Generate unique gift card code
                  const code = await generateUniqueGiftCardCode(supabase);
                  
                  // Create gift card in database
                  const { data: giftCard, error: giftCardError } = await supabase
                    .from('gift_cards')
                    .insert({
                      code,
                      initial_amount: amount,
                      current_balance: amount,
                      currency: 'EUR',
                      status: 'active',
                      purchaser_email: purchaserEmail,
                      recipient_email: purchaserEmail, // For now, send to purchaser (can add recipient fields later)
                      recipient_name: purchaserName,
                      stripe_payment_intent_id: paymentIntentId,
                      stripe_checkout_session_id: sessionId,
                      purchased_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                  if (giftCardError) {
                    console.error('[Gift Card] Failed to create gift card:', giftCardError);
                    continue;
                  }

                  console.info(`[Gift Card] Created gift card: ${code} for ${amount} EUR`);

                  // Send gift card email via n8n webhook
                  try {
                    // Use environment variable or fallback to hardcoded webhook URL
                    const n8nGiftCardWebhook = Deno.env.get('N8N_GIFT_CARD_WEBHOOK') || 'https://alexfinit.app.n8n.cloud/webhook/7818ae01-ba24-4071-95b2-fa3cd0c3fcf9';
                    
                    // Get recipient info from gift card (may differ from purchaser if gift was sent to someone else)
                    const recipientEmail = giftCard?.recipient_email || purchaserEmail;
                    const recipientName = giftCard?.recipient_name || purchaserName;
                    const personalMessage = giftCard?.personal_message || '';
                    const expiresAt = giftCard?.expires_at ? new Date(giftCard.expires_at).toLocaleDateString('nl-NL', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : null;
                    
                    // Get locale from metadata or default to 'nl'
                    const locale = metadata?.locale || 'nl';
                    
                    // Format amount to 2 decimal places
                    const formattedAmount = amount.toFixed(2);
                    
                    // Current year
                    const currentYear = new Date().getFullYear().toString();

                    await fetch(n8nGiftCardWebhook, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        // Email template variables
                        recipientName: recipientName,
                        purchaserName: purchaserName,
                        giftCardCode: code,
                        amount: formattedAmount,
                        locale: locale,
                        personalMessage: personalMessage,
                        expiresAt: expiresAt,
                        currentYear: currentYear,
                        
                        // Additional data for reference
                        recipientEmail: recipientEmail,
                        purchaserEmail: purchaserEmail,
                        currency: 'EUR',
                        orderId: order.id,
                        checkoutSessionId: sessionId,
                        giftCardId: giftCard?.id,
                      }),
                    });
                    console.info(`[Gift Card] Email webhook sent for gift card ${code} to ${recipientEmail}`);
                  } catch (emailError: any) {
                    console.error('[Gift Card] Failed to send email webhook:', emailError);
                    // Don't fail - gift card is created, email can be sent manually if needed
                  }
                }
              }
            } catch (giftCardError: any) {
              console.error('[Gift Card] Error processing gift cards:', giftCardError);
              // Don't fail the order if gift card creation fails - log and continue
            }
          }

          // Create order in Stoqflow
          try {
            const stoqflowClientId = Deno.env.get('STOQFLOW_CLIENT_ID');
            const stoqflowClientSecret = Deno.env.get('STOQFLOW_CLIENT_SECRET');
            const stoqflowShopId = Deno.env.get('STOQFLOW_SHOP_ID');
            const stoqflowBaseUrl = Deno.env.get('STOQFLOW_BASE_URL');

            if (stoqflowClientId && stoqflowClientSecret && stoqflowShopId && stoqflowBaseUrl) {
              console.info('[Stoqflow] Creating order in Stoqflow for webshop order');
              
              // Create Basic Auth header
              const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
              const basicAuth = btoa(credentials);
              const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;

              // Look up Stoqflow product IDs from Stripe product IDs
              // First try database lookup (by stripe_product_id), then fallback to API search
              const stoqflowOrderItems: any[] = [];
              
              // Helper function to lookup product in webshop_data by stripe_product_id to get Stoqflow ID
              const lookupProductInDatabase = async (stripeProductId: string): Promise<string | null> => {
                try {
                  const { data: product, error } = await supabase
                    .from('webshop_data')
                    .select('stoqflow_id, stripe_product_id, uuid')
                    .eq('stripe_product_id', stripeProductId)
                    .single();
                  
                  if (!error && product?.stoqflow_id) {
                    console.info(`[Stoqflow] Found Stoqflow ID in database: ${product.stoqflow_id} for Stripe product: ${stripeProductId}`);
                    return product.stoqflow_id;
                  }
                } catch (err: any) {
                  console.warn(`[Stoqflow] Error looking up product in database:`, err.message);
                }
                return null;
              };
              
              // Helper function to generate SKU from Stripe product ID (fallback method)
              const generateSKU = (stripeProductId: string): string => {
                const productId = stripeProductId || '';
                if (!productId) {
                  return `STR${Date.now().toString().slice(-10)}`;
                }
                let sku = productId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
                if (sku.length < 3) {
                  sku = `STR${sku}`.substring(0, 50);
                }
                sku = sku.replace(/::/g, '-').replace(/\|\|/g, '-');
                return sku;
              };
              
              // Helper function to search Stoqflow product with retry and backoff
              const searchStoqflowProduct = async (sku: string, retries = 3): Promise<any> => {
                for (let attempt = 0; attempt < retries; attempt++) {
                  try {
                    // Add delay before retry (exponential backoff)
                    if (attempt > 0) {
                      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
                      console.info(`[Stoqflow] Retrying product lookup (attempt ${attempt + 1}/${retries}) after ${delayMs}ms delay`);
                      await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                    
                    const productSearchRes = await fetch(`${apiBaseUrl}/products?sku=${encodeURIComponent(sku)}&fields=*`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${basicAuth}`,
                      },
                    });
                    
                    if (productSearchRes.status === 429) {
                      // Rate limited - wait longer and retry
                      if (attempt < retries - 1) {
                        const retryAfter = parseInt(productSearchRes.headers.get('Retry-After') || '60');
                        console.warn(`[Stoqflow] Rate limited (429), waiting ${retryAfter}s before retry`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        continue;
                      }
                    }
                    
                    if (productSearchRes.ok) {
                      const productData = await productSearchRes.json();
                      if (Array.isArray(productData) && productData.length > 0) {
                        return productData[0];
                      }
                    }
                    
                    // If not rate limited and not found, don't retry
                    if (productSearchRes.status !== 429) {
                      break;
                    }
                  } catch (err: any) {
                    console.warn(`[Stoqflow] Error searching product (attempt ${attempt + 1}):`, err.message);
                    if (attempt === retries - 1) throw err;
                  }
                }
                return null;
              };
              
              for (const item of productItems) {
                // Prefer stripeProductId for lookup, fallback to productId
                const productIdToUse = (item as any).stripeProductId || item.productId;
                
                if (!productIdToUse) {
                  console.warn('[Stoqflow] Skipping item without product ID:', item);
                  continue;
                }

                try {
                  // Check if productId looks like a Stoqflow ID (base58 format, ~17 chars)
                  const looksLikeStoqflowId = /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{15,20}$/.test(productIdToUse);
                  
                  if (looksLikeStoqflowId) {
                    // Assume it's already a Stoqflow product ID
                    stoqflowOrderItems.push({
                      product_id: productIdToUse,
                      quantity: item.quantity || 1,
                    });
                    console.info(`[Stoqflow] Using product_id directly (looks like Stoqflow ID): ${productIdToUse}`);
                  } else {
                    // It's a Stripe product ID - first try database lookup
                    let stoqflowProductId = await lookupProductInDatabase(productIdToUse);
                    
                    if (stoqflowProductId) {
                      // Found Stoqflow ID in database
                      stoqflowOrderItems.push({
                        product_id: stoqflowProductId,
                        quantity: item.quantity || 1,
                      });
                      console.info(`[Stoqflow] Using Stoqflow ID from database: ${stoqflowProductId}`);
                    } else {
                      // Not in database - generate SKU and search Stoqflow API (with retry)
                      const sku = generateSKU(productIdToUse);
                      console.info(`[Stoqflow] Looking up product by SKU: ${sku} (from Stripe product: ${productIdToUse})`);

                      const stoqflowProduct = await searchStoqflowProduct(sku);
                      
                      if (stoqflowProduct) {
                        stoqflowOrderItems.push({
                          product_id: stoqflowProduct._id,
                          quantity: item.quantity || 1,
                        });
                        console.info(`[Stoqflow] Found product: ${stoqflowProduct._id} (SKU: ${sku})`);
                      } else {
                        // Product not found - skip this item (Stoqflow requires product_id)
                        console.warn(`[Stoqflow] Product not found for SKU ${sku}, skipping item (product_id required by Stoqflow)`);
                        // Don't add item without product_id - Stoqflow will reject it
                      }
                    }
                  }
                } catch (lookupErr: any) {
                  console.warn(`[Stoqflow] Failed to lookup product for ${productIdToUse}:`, lookupErr.message);
                  // Don't add item without product_id - Stoqflow will reject it
                }
              }

              // Ensure we have at least one order item (required by API)
              if (stoqflowOrderItems.length === 0) {
                console.warn('[Stoqflow] No order items to sync, skipping Stoqflow order creation');
              } else {
                // Prepare client_info from shipping address
                // According to API: if only client_info is provided, Stoqflow will try to find/create client
                const clientInfo: any = {};
                if (shippingAddress) {
                  clientInfo.name = shippingAddress.name || orderInsert.customer_name || 'Guest';
                  clientInfo.address_1 = shippingAddress.street || '';
                  clientInfo.address_2 = shippingAddress.street2 || '';
                  clientInfo.city = shippingAddress.city || '';
                  clientInfo.postal_code = shippingAddress.postalCode || '';
                  clientInfo.country = shippingAddress.country || 'BE';
                } else {
                  clientInfo.name = orderInsert.customer_name || 'Guest';
                  clientInfo.country = 'BE';
                }
                clientInfo.email = orderInsert.customer_email || '';

                // Prepare notes (max 500 characters according to API)
                const notesText = `Stripe Order: ${sessionId} | Customer: ${orderInsert.customer_email}`;
                const notes = notesText.length > 500 ? notesText.substring(0, 497) + '...' : notesText;

                // Create order payload according to Stoqflow API v2 documentation
                // Required fields: shop_id, order_items (non-empty array)
                const stoqflowPayload: any = {
                  shop_id: stoqflowShopId, // Required
                  order_items: stoqflowOrderItems, // Required, non-empty array
                };

                // Optional fields
                // Status: "concept", "awaiting-payment", "ready-to-pick", "on-hold" (default: "concept")
                // Use "ready-to-pick" since payment is already completed
                stoqflowPayload.status = 'ready-to-pick';

                // Type of goods: "gift", "documents", "commercial-goods", "commercial-sample", "returned-goods"
                stoqflowPayload.type_of_goods = 'commercial-goods';

                // Client handling: if client_id provided, use it; otherwise use client_info
                const stoqflowOrderClientId = Deno.env.get('STOQFLOW_ORDER_CLIENT_ID');
                if (stoqflowOrderClientId) {
                  // If client_id is provided, Stoqflow will use existing client and overwrite client_info
                  stoqflowPayload.client_id = stoqflowOrderClientId;
                } else {
                  // If only client_info provided, Stoqflow will find/create client based on email/vat
                  stoqflowPayload.client_info = clientInfo;
                }

                // Origin: identifiers for connected platforms (Stripe in this case)
                stoqflowPayload.origin = {
                  id: sessionId, // Stripe checkout session ID
                  number: order.id?.toString() || sessionId, // Order number reference
                };

                // Notes: max 500 characters
                stoqflowPayload.notes = notes;

                // Validate payload before sending
                if (!stoqflowShopId) {
                  throw new Error('STOQFLOW_SHOP_ID is required but not set');
                }
                if (!Array.isArray(stoqflowOrderItems) || stoqflowOrderItems.length === 0) {
                  throw new Error('order_items must be a non-empty array');
                }

                console.info('[Stoqflow] Creating order with payload:', {
                  shop_id: stoqflowShopId,
                  item_count: stoqflowOrderItems.length,
                  items_with_product_id: stoqflowOrderItems.filter((item: any) => item.product_id).length,
                  items_without_product_id: stoqflowOrderItems.filter((item: any) => !item.product_id).length,
                  status: stoqflowPayload.status,
                  type_of_goods: stoqflowPayload.type_of_goods,
                  has_client_id: !!stoqflowOrderClientId,
                  has_client_info: !!stoqflowPayload.client_info,
                  session_id: sessionId,
                });

                const stoqflowRes = await fetch(`${apiBaseUrl}/orders`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuth}`,
                  },
                  body: JSON.stringify(stoqflowPayload),
                });

                if (stoqflowRes.ok) {
                  const stoqflowData = await stoqflowRes.json();
                  stoqflowOrderId = stoqflowData._id;
                  console.info('[Stoqflow] Order created successfully:', {
                    stoqflow_order_id: stoqflowOrderId,
                    session_id: sessionId,
                  });
                  
                  // Update the stripe_orders record with Stoqflow order ID
                  if (stoqflowOrderId && order?.id) {
                    await supabase
                      .from('stripe_orders')
                      .update({ 
                        metadata: {
                          ...orderInsert.metadata,
                          stoqflow_order_id: stoqflowOrderId,
                        }
                      })
                      .eq('id', order.id);
                  }
                } else {
                  const errorText = await stoqflowRes.text();
                  let errorMessage = errorText;
                  let errorDetails: any = null;
                  
                  try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorText;
                    errorDetails = errorJson;
                  } catch {
                    // Keep original error text if not JSON
                  }
                  
                  console.error('[Stoqflow] ❌ Failed to create order:', {
                    status: stoqflowRes.status,
                    statusText: stoqflowRes.statusText,
                    error: errorMessage,
                    error_details: errorDetails,
                    session_id: sessionId,
                    payload_summary: {
                      shop_id: stoqflowPayload.shop_id,
                      item_count: stoqflowOrderItems.length,
                      status: stoqflowPayload.status,
                      has_client_id: !!stoqflowPayload.client_id,
                      has_client_info: !!stoqflowPayload.client_info,
                    },
                  });
                }
              }
            } else {
              console.warn('[Stoqflow] Missing environment variables, skipping Stoqflow order creation', {
                hasClientId: !!stoqflowClientId,
                hasClientSecret: !!stoqflowClientSecret,
                hasShopId: !!stoqflowShopId,
                hasBaseUrl: !!stoqflowBaseUrl,
              });
            }
          } catch (err: any) {
            console.error('[Stoqflow] Error creating order:', {
              error: err.message,
              error_type: err?.constructor?.name,
              session_id: sessionId,
            });
            // Don't fail the webhook if Stoqflow fails - order is already created in database
          }
        }

        // Call N8N webhook for order confirmation
        const n8nWebhookUrl =
          'https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf66';

        const items = [...productItems, ...shippingItems];
        // Calculate product subtotal (excluding shipping) from original prices
        const productSubtotal = productItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        // Get discount amount from Stripe (discount only applies to products, not shipping)
        const discountAmount = ((fullSession as any).total_details?.amount_discount ?? 0) / 100;

        const payload = {
          session: fullSession,
          order: {
            checkout_session_id: sessionId,
            // Convert Brussels time to UTC for database storage
            created_at: new Date(nowBrussels()).toISOString(),
            amount_subtotal: fullSession.amount_subtotal, // Stripe's subtotal (in cents, after discount, before shipping)
            amount_total: fullSession.amount_total, // Stripe's total (in cents)
            // Detailed breakdown for easier processing:
            product_subtotal: productSubtotal, // Original product prices before discount (in euros)
            discount_amount: discountAmount, // Discount applied to products only (in euros)
            shipping_cost: shippingCost, // Shipping cost (in euros, never discounted)
            final_total: productSubtotal - discountAmount + shippingCost, // Final total (in euros)
            items,
            // Promo code info for invoice creation
            promoCode: webshopPromoCode,
            promoDiscountPercent: webshopPromoDiscountPercent,
            // Gift card discount info for invoice creation
            giftCardCode: giftCardCodeUsed,
            giftCardDiscount: giftCardDiscountAmount > 0 ? giftCardDiscountAmount : null,
            // Stoqflow integration
            stoqflow_order_id: stoqflowOrderId || null, // Stoqflow order ID if created successfully
          },
        };

        try {
          console.info('[N8N] Calling webshop confirmation webhook', {
            url: n8nWebhookUrl,
            sessionId,
          });

          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          console.info('[N8N] Webshop webhook response', {
            status: res.status,
            ok: res.ok,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error('[N8N] Webshop webhook error body', text);
          }
        } catch (err) {
          console.error('[N8N] Failed to call webshop webhook', err);
        }

        return;
      } else {
        // Log why webshop order wasn't processed
        console.warn(`⚠️ Session ${sessionId} was not processed as webshop order. Reasons:`, {
          has_metadata: !!metadata,
          order_type: metadata?.order_type,
          has_tourId: !!metadata?.tourId,
          mode: mode,
          payment_status: payment_status,
        });
        console.warn(`⚠️ This order will NOT be saved to database. Check that checkout session includes order_type: 'webshop' or 'giftcard' in metadata.`);
      }

    }

    // Handle subscription checkouts
    if (mode === 'subscription' && 'customer' in session && session.customer) {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    }

    return;
  }

  // Handle other subscription-related events
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'invoice.payment_succeeded' ||
    event.type === 'invoice.payment_failed'
  ) {
    if ('customer' in stripeData && stripeData.customer) {
      const customerId = typeof stripeData.customer === 'string' ? stripeData.customer : stripeData.customer.id;
      console.info(`Syncing subscription for customer: ${customerId} (event: ${event.type})`);
      await syncCustomerFromStripe(customerId);
    }
    return;
  }

  console.info(`Unhandled event type: ${event.type}`);
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}