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
              const inviteeExists = currentInvitees.some((inv: any) => inv.email === bookingData.customerEmail);

              if (!inviteeExists) {
                const newInvitee = {
                  name: bookingData.customerName,
                  email: bookingData.customerEmail,
                  phone: bookingData.customerPhone,
                  numberOfPeople: bookingData.numberOfPeople,
                  language: bookingData.language,
                  specialRequests: bookingData.specialRequests,
                  requestTanguy: bookingData.requestTanguy,
                  amount: bookingData.amounts.tourFinalAmount,
                  originalAmount: bookingData.amounts.tourFullPrice,
                  discountApplied: bookingData.amounts.discountAmount,
                  tanguyCost: bookingData.amounts.tanguyCost,
                  extraHourCost: bookingData.amounts.extraHourCost,
                  currency: 'eur',
                  isContacted: false,
                  upsellProducts: bookingData.upsellProducts,
                  opMaatAnswers: bookingData.opMaatAnswers,
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
              } else {
                console.info(`Invitee already exists in tourbooking ${tourbookingId}`);
              }
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
                amount: bookingData.amounts.tourFinalAmount,
                originalAmount: bookingData.amounts.tourFullPrice,
                discountApplied: bookingData.amounts.discountAmount,
                tanguyCost: bookingData.amounts.tanguyCost,
                extraHourCost: bookingData.amounts.extraHourCost,
                currency: 'eur',
                isContacted: false,
                upsellProducts: bookingData.upsellProducts,
                opMaatAnswers: bookingData.opMaatAnswers,
                tourStartDatetime: bookingData.tourDatetime,
                tourEndDatetime: bookingData.tourEndDatetime,
                durationMinutes: bookingData.durationMinutes,
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
              amount: bookingData.amounts.tourFinalAmount,
              originalAmount: bookingData.amounts.tourFullPrice,
              discountApplied: bookingData.amounts.discountAmount,
              tanguyCost: bookingData.amounts.tanguyCost,
              extraHourCost: bookingData.amounts.extraHourCost,
              currency: 'eur',
              isContacted: false,
              upsellProducts: bookingData.upsellProducts,
              opMaatAnswers: bookingData.opMaatAnswers,
              tourStartDatetime: bookingData.tourDatetime,
              tourEndDatetime: bookingData.tourEndDatetime,
              durationMinutes: bookingData.durationMinutes,
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
              shippingCost += (item.amount_total ?? 0) / 100;
              shippingItems.push({
                title: itemNameStr,
                quantity: item.quantity ?? 1,
                price: (item.amount_total ?? 0) / 100,
              });
            } else {
              productItems.push({
                title: itemNameStr || 'Product',
                quantity: item.quantity ?? 1,
                price: (item.amount_total ?? 0) / 100,
              });
            }
          }
        }

        // If shipping not found in line items, calculate from totals
        if (shippingCost === 0 && fullSession.amount_subtotal && fullSession.amount_total) {
          shippingCost = (fullSession.amount_total - fullSession.amount_subtotal) / 100;
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
          items: productItems,
          metadata: {
            customerName: metadata?.customerName || 'Guest',
            customerEmail: fullSession.customer_email || metadata?.customerEmail || 'unknown@email.com',
            customerPhone: metadata?.customerPhone || '',
            userId: metadata?.userId && metadata.userId.trim() !== '' ? metadata.userId : null,
            shipping_cost: shippingCost,
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

        const payload = {
          session: fullSession,
          order: {
            checkout_session_id: sessionId,
            created_at: new Date().toISOString(),
            amount_subtotal: fullSession.amount_subtotal,
            amount_total: fullSession.amount_total,
            shipping_cost: shippingCost,
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