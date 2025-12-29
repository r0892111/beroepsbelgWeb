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
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.error('No stripe data in event');
    return;
  }

  // Handle checkout session completed events (for tour bookings and webshop orders)
  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    const { id: sessionId, mode, payment_status, metadata } = session;

    console.info(`Processing checkout.session.completed: ${sessionId}, mode: ${mode}, status: ${payment_status}`);

    if (mode === 'payment' && payment_status === 'paid') {
      // First, check if tour booking exists and its current status and booking type
      const { data: existingBooking, error: checkError } = await supabase
        .from('tourbooking')
        .select('id, status, tour_id, booking_type')
        .eq('stripe_session_id', sessionId)
        .single();

      // Determine the appropriate status based on booking type
      let newStatus = 'payment_completed'; // Default for B2C bookings
      if (existingBooking?.booking_type === 'B2B') {
        // For B2B quote bookings, use quote_paid status
        newStatus = 'quote_paid';
      }

      // If booking exists and is already processed, skip webhook call (idempotency)
      if (existingBooking && existingBooking.status === newStatus) {
        console.info(`Tour booking for session ${sessionId} already processed with status ${newStatus}, skipping webhook call`);
        return;
      }

      // Update tour booking status
      const { data: tourBooking, error: tourBookingError } = await supabase
        .from('tourbooking')
        .update({ status: newStatus })
        .eq('stripe_session_id', sessionId)
        .neq('status', newStatus) // Only update if not already at this status
        .select()
        .single();

      if (tourBooking) {
        console.info(`Successfully updated tour booking for session: ${sessionId}`);
        
        // Check if this is a local stories tour and update local_tours_bookings
        const { data: tour, error: tourError } = await supabase
          .from('tours_table_prod')
          .select('local_stories')
          .eq('id', tourBooking.tour_id)
          .single();
        
        if (!tourError && tour?.local_stories === true) {
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