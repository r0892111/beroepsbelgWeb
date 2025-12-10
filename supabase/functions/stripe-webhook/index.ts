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
      // First, try to update a tour booking
      const { data: tourBooking, error: tourBookingError } = await supabase
        .from('tourbooking')
        .update({ status: 'completed' })
        .eq('stripe_session_id', sessionId)
        .select()
        .single();

      if (tourBooking) {
        console.info(`Successfully updated tour booking for session: ${sessionId}`);
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