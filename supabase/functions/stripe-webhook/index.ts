import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

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
    console.info('[Webhook] Received request:', {
      method: req.method,
      url: req.url,
      hasSignature: !!req.headers.get('stripe-signature'),
    });

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      console.warn('[Webhook] Invalid method:', req.method);
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] No signature found in headers');
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();
    console.info('[Webhook] Body received, length:', body.length);

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.info('[Webhook] Signature verified, event type:', event.type, 'event id:', event.id);
    } catch (error: any) {
      console.error(`[Webhook] Signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
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
    const { id: sessionId, mode, payment_status, metadata } = session;

    console.info(`Processing checkout.session.completed: ${sessionId}, mode: ${mode}, status: ${payment_status}`);

    // Retrieve the session with discounts expanded to get promo code info
    let promoCodeInfo: { code: string | null; discountAmount: number; discountPercent: number | null } = {
      code: null,
      discountAmount: 0,
      discountPercent: null,
    };

    try {
      // Retrieve the full session with line items and discounts expanded
      const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['total_details.breakdown', 'discounts.promotion_code'],
      });

      // Get discount amount from total_details
      const discountAmountCents = fullSession.total_details?.amount_discount || 0;
      promoCodeInfo.discountAmount = discountAmountCents / 100; // Convert to euros

      // Get promo code from discounts
      if (fullSession.discounts && fullSession.discounts.length > 0) {
        const discount = fullSession.discounts[0] as any; // First discount
        if (discount.promotion_code && typeof discount.promotion_code === 'object') {
          promoCodeInfo.code = discount.promotion_code.code || null;
        }
        // Get discount percent from coupon if available
        if (discount.coupon) {
          promoCodeInfo.discountPercent = discount.coupon.percent_off || null;
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
          const saturdayDateTime = saturdayDateStr ? `${saturdayDateStr}T14:00:00` : null;

          // Look for existing tourbooking for this Saturday
          if (saturdayDateStr) {
            const { data: existingTourBookings } = await supabase
              .from('tourbooking')
              .select('id, invitees')
              .eq('tour_id', bookingData.tourId)
              .gte('tour_datetime', `${saturdayDateStr}T00:00:00`)
              .lt('tour_datetime', `${saturdayDateStr}T23:59:59`);

            if (existingTourBookings && existingTourBookings.length > 0) {
              // Use existing tourbooking
              const existingTourBooking = existingTourBookings[0];
              tourbookingId = existingTourBooking.id;

              // Append new invitee to existing invitees
              const currentInvitees = existingTourBooking.invitees || [];
              const newInvitee = {
                name: bookingData.customerName,
                email: bookingData.customerEmail,
                phone: bookingData.customerPhone,
                numberOfPeople: bookingData.numberOfPeople,
                language: bookingData.language,
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

              const updatedInvitees = [...currentInvitees, newInvitee];
              await supabase
                .from('tourbooking')
                .update({
                  invitees: updatedInvitees,
                  stripe_session_id: sessionId, // Update to latest session
                  status: 'payment_completed'
                })
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

            const localBookingData = {
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

            // Always insert a new entry - each customer booking gets their own row
            const { error: localInsertError } = await supabase
              .from('local_tours_bookings')
              .insert(localBookingData);

            if (localInsertError) {
              console.error('Error creating local_tours_bookings:', localInsertError);
            } else {
              console.info(`Created local_tours_bookings entry for session ${sessionId}`);
            }
          }

        } else {
          // STANDARD or OP_MAAT: Simple insert
          console.info(`Processing ${tourType} booking`);

          const newTourBooking = {
            tour_id: bookingData.tourId,
            stripe_session_id: sessionId,
            status: 'payment_completed',
            tour_datetime: bookingData.tourDatetime,
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
            console.error(`Error creating ${tourType} tourbooking:`, insertError);
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

        // Call N8N webhook for tour booking confirmation
        const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';

        const payload = {
          ...session,
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
            booking_id: createdBookingId,
          },
          bookingData, // Include full booking data
          // Include promo code info for invoice creation
          promoCode: promoCodeInfo.code,
          promoDiscountAmount: promoCodeInfo.discountAmount,
          promoDiscountPercent: promoCodeInfo.discountPercent,
        };

        try {
          console.info('[N8N] Calling tour booking webhook', {
            url: n8nWebhookUrl,
            sessionId,
            tourType,
          });

          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          console.info('[N8N] Tour booking webhook response', {
            status: res.status,
            ok: res.ok,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error('[N8N] Tour booking webhook error body', text);
          }
        } catch (err) {
          console.error('[N8N] Failed to call tour booking webhook', err);
        }

        } catch (bookingError) {
          console.error('Error processing tour booking:', bookingError);
          console.error('Booking data that caused error:', JSON.stringify({
            tourId: bookingData?.tourId,
            tourType,
            sessionId,
          }));
          // Don't delete pending booking on error so we can retry/investigate
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
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...session, metadata: { ...metadata, stripe_session_id: sessionId } }),
          });
        } catch (err) {
          console.error('[N8N] Failed to call tour booking webhook for legacy booking', err);
        }

        return;
      }

      // Check if this is a manual payment link from admin panel
      if (metadata?.isManualPaymentLink === 'true' && metadata?.bookingId) {
        console.info(`Processing manual payment link for booking ${metadata.bookingId}, session ${sessionId}`);

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
          console.error(`Manual payment link: Booking ${bookingId} not found`, bookingError);
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
          console.error(`Manual payment link: Failed to update booking ${bookingId}`, updateError);
        } else {
          console.info(`Manual payment link: Updated booking ${bookingId} with stripe_session_id ${sessionId} and payment status`);
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
            paidAt: new Date().toISOString(),
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
            console.error(`Manual payment link: Failed to update local_tours_bookings ${localBookingId}`, localUpdateError);
          } else {
            console.info(`Manual payment link: Updated local_tours_bookings ${localBookingId} - cleared pending payment, logged payment of €${amountPaid}`);
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

          // Mark this as a manual payment link for n8n to identify
          isManualPaymentLink: true,
          isExtraInvitees: isExtraInvitees,
        };

        // Use different webhook URL based on whether this is extra invitees or normal payment
        // Extra invitees don't need confirmation email (they're being added to existing booking)
        const n8nWebhookUrl = isExtraInvitees
          ? 'https://alexfinit.app.n8n.cloud/webhook/manual-payment-extra-invitees-completed'
          : 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';

        const payload = {
          ...session,
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
            booking_id: bookingId,
            extra_invitees: isExtraInvitees,
          },
          bookingData, // Include full booking data matching normal booking format
        };

        try {
          console.info('[N8N] Calling tour booking webhook for manual payment link', {
            url: n8nWebhookUrl,
            sessionId,
            bookingId,
            isExtraInvitees,
          });

          const res = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

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
          console.error('[N8N] Failed to call tour booking webhook for manual payment', err);
        }

        return;
      }

      // Check if this is a lecture payment link from admin panel
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
            updated_at: new Date().toISOString(),
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
              paidAt: new Date().toISOString(),
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
      console.info(`Checking for webshop order. Metadata:`, JSON.stringify(metadata || {}));

      // If this has tourId in metadata, it's a tour booking - don't process as webshop
      if (metadata?.tourId) {
        console.error(`Tour booking (tourId: ${metadata.tourId}) could not be processed - no pending or legacy booking found. Check pending_tour_bookings table exists.`);
        return;
      }

      if (metadata?.order_type === 'webshop') {
        console.info(`Processing webshop order for session: ${sessionId}`);

        // Retrieve full session with line items and shipping details
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items', 'line_items.data.price.product'],
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
              productItems.push({
                title: itemNameStr || 'Product',
                quantity: quantity,
                price: unitPrice,
                productId: productIds[productIndex] || null, // Include product ID if available
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

        const orderInsert = {
          checkout_session_id: sessionId,
          payment_intent_id: paymentIntentId,
          customer_id: customerId,
          currency: fullSession.currency || 'eur',
          payment_status: fullSession.payment_status || 'paid',
          status: 'completed',
          amount_subtotal: fullSession.amount_subtotal || 0,
          amount_total: fullSession.amount_total || 0,
          customer_name: metadata?.customerName || 'Guest',
          customer_email: fullSession.customer_email || metadata?.customerEmail || 'unknown@guest.com',
          shipping_address: shippingAddress,
          billing_address: shippingAddress, // Use shipping as billing
          items: [...productItems, ...shippingItems],
          metadata: {
            customerName: metadata?.customerName || 'Guest',
            customerEmail: fullSession.customer_email || metadata?.customerEmail || 'unknown@email.com',
            customerPhone: metadata?.customerPhone || '',
            userId: metadata?.userId && metadata.userId.trim() !== '' ? metadata.userId : null,
            shipping_cost: shippingCost,
            discount_amount: ((fullSession as any).total_details?.amount_discount ?? 0) / 100, // Discount in euros 
            productIds: productIds, // Store product IDs for easy retrieval
          },
          total_amount: (fullSession.amount_total || 0) / 100, // In euros
          user_id: metadata?.userId && metadata.userId.trim() !== '' ? metadata.userId : null,
        };

        console.info('Inserting webshop order:', JSON.stringify(orderInsert, null, 2));

        // Insert the order (checkout no longer creates it due to NOT NULL constraints)
        const { data: order, error: orderError } = await supabase
          .from('stripe_orders')
          .insert(orderInsert)
          .select()
          .single();

        if (orderError) {
          console.error('Error creating webshop order:', orderError);
        } else {
          console.info(`Successfully created webshop order for session: ${sessionId}, order ID: ${order.id}`);
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
            created_at: new Date().toISOString(),
            amount_subtotal: fullSession.amount_subtotal, // Stripe's subtotal (in cents, after discount, before shipping)
            amount_total: fullSession.amount_total, // Stripe's total (in cents)
            // Detailed breakdown for easier processing:
            product_subtotal: productSubtotal, // Original product prices before discount (in euros)
            discount_amount: discountAmount, // Discount applied to products only (in euros)
            shipping_cost: shippingCost, // Shipping cost (in euros, never discounted)
            final_total: productSubtotal - discountAmount + shippingCost, // Final total (in euros)
            items,
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