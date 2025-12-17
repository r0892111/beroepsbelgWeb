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

    // Process event in background and respond immediately to Stripe
    // Stripe requires a quick response (within 3 seconds ideally)
    EdgeRuntime.waitUntil(
      handleEvent(event).catch((error) => {
        console.error('Error in background event processing:', error);
      })
    );

    // Return immediate response to Stripe
    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event): Promise<void> {
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
        .select('id, tour_id')
        .single();

      if (tourBooking && tourBooking.tour_id) {
        console.info(`Successfully updated tour booking for session: ${sessionId}, booking ID: ${tourBooking.id}`);
        
        const { data: tour, error: tourError } = await supabase
          .from('tours_table_prod')
          .select('id, local_stories')
          .eq('id', tourBooking.tour_id!)
          .maybeSingle();

        let fullBooking: any = null;
        let fetchError: any = null;

        if (tour?.local_stories) {
          const { data: localBooking, error: localError } = await supabase
            .from('local_tours_bookings')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .single();
          
          fullBooking = localBooking;
          fetchError = localError;
        } else {
          // Fetch full booking data to send to n8n
          const { data: bookingData, error: bookingError } = await supabase
            .from('tourbooking')
            .select('*')
            .eq('id', tourBooking.id)
            .single();
          
          fullBooking = bookingData;
          fetchError = bookingError;
        }

        if (fullBooking && !fetchError) {
          // Fetch tour data to get city slug
          let citySlug = fullBooking.city || '';
          if (!citySlug && fullBooking.tour_id) {
            const { data: tourData } = await supabase
              .from('tours_table_prod')
              .select('city')
              .eq('id', fullBooking.tour_id)
              .single();
            citySlug = tourData?.city || '';
          }
          
          // Format booking date from tour_datetime or metadata
          const bookingDate = metadata?.bookingDate || 
            (fullBooking.tour_datetime 
              ? new Date(fullBooking.tour_datetime).toISOString().split('T')[0]
              : '');
          
          // Call n8n webhook with data formatted like Stripe checkout session
          const n8nWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc';
          
          try {
            // Format the payload to match Stripe checkout session structure
            const n8nPayload = {
              body: {
                ...session, // Include full Stripe session object
                // Ensure metadata is present and properly formatted
                metadata: {
                  ...metadata,
                  customerName: metadata?.customerName || session.customer_details?.name || '',
                  customerPhone: metadata?.customerPhone || '',
                  bookingDate: bookingDate,
                  tourId: metadata?.tourId || fullBooking.tour_id || '',
                  numberOfPeople: metadata?.numberOfPeople || '1',
                  language: metadata?.language || 'nl',
                  requestTanguy: metadata?.requestTanguy || 'false',
                  specialRequests: metadata?.specialRequests || '',
                  userId: metadata?.userId || '',
                  bookingTime: metadata?.bookingTime || '',
                },
                // Add additional fields that n8n expects
                additionalInfo: metadata?.specialRequests || '',
                citySlug: citySlug,
                // Ensure customer_email is at body level
                customer_email: session.customer_email || metadata?.customerEmail || '',
              },
            };
            
            const n8nResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(n8nPayload),
            });
            
            if (n8nResponse.ok) {
              console.info(`Successfully called n8n webhook for booking ${tourBooking.id}`);
            } else {
              const errorText = await n8nResponse.text();
              console.error(`n8n webhook returned error status ${n8nResponse.status}: ${errorText}`);
            }
          } catch (n8nError) {
            console.error('Error calling n8n webhook:', n8nError);
            // Don't throw - we don't want to fail the webhook if n8n call fails
          }
        } else {
          console.warn(`Could not fetch full booking data for n8n webhook: ${fetchError?.message || 'Unknown error'}`);
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