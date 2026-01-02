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
      // Check if this is a local stories booking by checking local_tours_bookings first
      const { data: localBooking, error: localBookingError } = await supabase
        .from('local_tours_bookings')
        .select('id, status, booking_id, tour_id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      const isLocalStories = !!localBooking;

      // For local stories bookings, check if the tour is actually a local stories tour
      let tourIsLocalStories = false;
      if (isLocalStories && localBooking?.tour_id) {
        const { data: tour } = await supabase
          .from('tours_table_prod')
          .select('local_stories')
          .eq('id', localBooking.tour_id)
          .maybeSingle();
        tourIsLocalStories = tour?.local_stories === true || tour?.local_stories === 'true' || tour?.local_stories === 1;
      }

      // First, check if tour booking exists and its current status and booking type
      const { data: existingBooking, error: checkError } = await supabase
        .from('tourbooking')
        .select('id, status, tour_id, booking_type')
        .eq('stripe_session_id', sessionId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle cases where no booking exists yet

      // Determine the appropriate status based on booking type
      let newStatus = 'payment_completed'; // Default for B2C bookings
      if (existingBooking?.booking_type === 'B2B') {
        // For B2B quote bookings, use quote_paid status
        newStatus = 'quote_paid';
      }

      // For local stories bookings: always process the webhook
      // The tourbooking is the parent (one per Saturday tour), and local_tours_bookings is just another signup
      // Each person joining should trigger the webhook, regardless of the parent tourbooking status
      if (tourIsLocalStories) {
        // Always process local stories bookings - each signup is independent
        // The update queries below have built-in idempotency (they won't update if already at target status)
        console.info(`Processing local stories booking for session ${sessionId} - tourbooking status: ${existingBooking?.status || 'none'}, local_tours_bookings status: ${localBooking?.status || 'none'}`);
      } else {
        // For non-local-stories bookings, use the original idempotency check
      // If booking exists and is already processed, skip webhook call (idempotency)
      if (existingBooking && existingBooking.status === newStatus) {
        console.info(`Tour booking for session ${sessionId} already processed with status ${newStatus}, skipping webhook call`);
        return;
        }
      }

      // Update tour booking status
      const { data: tourBooking, error: tourBookingError } = await supabase
        .from('tourbooking')
        .update({ status: newStatus })
        .eq('stripe_session_id', sessionId)
        .neq('status', newStatus) // Only update if not already at this status
        .select()
        .maybeSingle(); // Use maybeSingle() to handle cases where no booking exists or already at target status

      // Determine tour_id for local stories check (from existingBooking, tourBooking, or localBooking)
      const tourIdForCheck = existingBooking?.tour_id || tourBooking?.tour_id || localBooking?.tour_id;

      if (tourBooking) {
        console.info(`Successfully updated tour booking for session: ${sessionId}`);
      } else if (tourBookingError && tourBookingError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine - might be a webshop order or local stories booking
        console.error(`Error updating tour booking for session ${sessionId}:`, tourBookingError);
      } else {
        // No booking updated - might already be at target status or doesn't exist yet
        console.info(`Tour booking for session ${sessionId} not updated (may already be at status ${newStatus} or doesn't exist)`);
      }
      
      // For local stories bookings, always process webhook regardless of tourbooking status
      // The tourbooking is the parent (one per Saturday tour), and local_tours_bookings is just another signup
      if (tourIsLocalStories) {
        // Always update local_tours_bookings for local stories bookings
        if (tourIdForCheck) {
          const { data: tour, error: tourError } = await supabase
            .from('tours_table_prod')
            .select('local_stories')
            .eq('id', tourIdForCheck)
            .maybeSingle();
          
          if (!tourError && (tour?.local_stories === true || tour?.local_stories === 'true' || tour?.local_stories === 1)) {
            // Update local_tours_bookings entry - ensure stripe_session_id is set and status is booked
            const { error: localBookingUpdateError } = await supabase
              .from('local_tours_bookings')
              .update({ 
                stripe_session_id: sessionId,
                status: 'booked'
              })
              .eq('stripe_session_id', sessionId)
              .neq('status', 'booked'); // Only update if not already booked
            
            if (localBookingUpdateError) {
              console.error('Error updating local_tours_bookings:', localBookingUpdateError);
            } else {
              console.info(`Successfully updated local_tours_bookings for session: ${sessionId}`);
            }
          }
        }

        // Always call N8N webhook for local stories bookings (each signup is independent)
        const n8nWebhookUrl =
          'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';

        const payload = {
          ...session, // full Stripe checkout session
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
          },
        };

        try {
          console.info('[N8N] Calling tour booking webhook for local stories booking', {
            url: n8nWebhookUrl,
            sessionId,
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

        return; // Done processing local stories booking
      }

      // For non-local-stories bookings, only process if we have a tourBooking
      if (tourBooking) {
        // Check if this is a local stories tour and update local_tours_bookings (shouldn't happen here, but just in case)
        const { data: tour, error: tourError } = await supabase
          .from('tours_table_prod')
          .select('local_stories')
          .eq('id', tourBooking.tour_id)
          .maybeSingle();
        
        if (!tourError && (tour?.local_stories === true || tour?.local_stories === 'true' || tour?.local_stories === 1)) {
          // Update local_tours_bookings entry - ensure stripe_session_id is set and status is booked
          const { error: localBookingError } = await supabase
            .from('local_tours_bookings')
            .update({ 
              stripe_session_id: sessionId,
              status: 'booked'
            })
            .eq('stripe_session_id', sessionId)
            .neq('status', 'booked'); // Only update if not already booked
          
          if (localBookingError) {
            console.error('Error updating local_tours_bookings:', localBookingError);
          } else {
            console.info(`Successfully updated local_tours_bookings for session: ${sessionId}`);
          }
        }

        const n8nWebhookUrl =
          'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';

        const payload = {
          ...session, // full Stripe checkout session
          metadata: {
            ...metadata,
            stripe_session_id: sessionId,
          },
        };

        try {
          console.info('[N8N] Calling tour booking webhook', {
            url: n8nWebhookUrl,
            sessionId,
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

        return;
      }


      if (tourBookingError && tourBookingError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine - might be a webshop order
        console.error('Error updating tour booking:', tourBookingError);
      }

      // If no tour booking found, try to update a webshop order
      const { data: order, error: orderError } = await supabase
        .from('stripe_orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('checkout_session_id', sessionId)
        .select()
        .single();

      if (order) {
        console.info(`Successfully updated webshop order for session: ${sessionId}`);

const n8nWebhookUrl =
  'https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf66';

// Build items array for n8n (used by "Items to HTML")
const items =
  (session.line_items?.data ?? []).map((item) => ({
    title: item.description ?? '',
    quantity: item.quantity ?? 1,
    price: (item.amount_total ?? 0) / 100,
  }));

const payload = {
  session, // FULL Stripe session (Webhook2 uses this everywhere)

  order: {
    checkout_session_id: order.checkout_session_id,
    created_at: order.created_at,
    amount_subtotal: order.amount_subtotal,
    total_amount: order.total_amount,
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

      if (orderError && orderError.code !== 'PGRST116') {
        console.error('Error updating webshop order:', orderError);
      }

      // If neither found, log it
      if (!tourBooking && !order) {
        console.warn(`No booking or order found for session: ${sessionId}`);
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