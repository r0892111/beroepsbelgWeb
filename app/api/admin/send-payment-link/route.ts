import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

// Warn if using test key in production
if (stripeSecretKey?.startsWith('sk_test_')) {
  console.warn('[WARNING] Using Stripe TEST key. Payment links will be in test mode.');
  console.warn('To use live payments, update STRIPE_SECRET_KEY to a live key (starts with sk_live_)');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
});

const N8N_PAYMENT_LINK_WEBHOOK = 'https://alexfinit.app.n8n.cloud/webhook/faa0ec47-e8f7-4e4e-a358-2b8fe5f074a2';

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function getSupabaseClientForAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const supabaseAnon = await getSupabaseClientForAuth(request);
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

      const supabaseServer = getSupabaseServer();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('isAdmin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true;
      return { isAdmin, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      bookingId,
      customerName,
      customerEmail,
      tourName,
      tourId,
      numberOfPeople,
      amount, // Amount in euros
      localBookingId, // Optional: for local stories bookings
      city,
      tourDatetime,
      fees, // Optional: fee data for op_maat tours
      isExtraInvitees, // Optional: true for extra people payments
    } = body;

    // Validate required fields
    console.log('Payment request:', { bookingId, customerName, customerEmail, tourName, numberOfPeople, amount, localBookingId });

    if (!customerName || !customerEmail || !tourName || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, customerEmail, tourName, bookingId' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null || amount <= 0) {
      return NextResponse.json(
        { error: `Invalid amount: ${amount}. Amount must be greater than 0.` },
        { status: 400 }
      );
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://beroepsbelg.be';

    // Build line items - main tour price plus any fee line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Calculate base tour price (amount minus fees)
    const tanguyCost = fees?.tanguyCost || 0;
    const extraHourCost = fees?.extraHourCost || 0;
    const weekendFeeCost = fees?.weekendFeeCost || 0;
    const eveningFeeCost = fees?.eveningFeeCost || 0;
    const totalFees = tanguyCost + extraHourCost + weekendFeeCost + eveningFeeCost;
    const baseTourPrice = amount - totalFees;

    // Main tour line item
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: tourName,
          description: `${numberOfPeople} ${numberOfPeople === 1 ? 'person' : 'people'}`,
        },
        unit_amount: Math.round(baseTourPrice * 100), // Convert to cents
      },
      quantity: 1,
    });

    // Add fee line items if present
    if (tanguyCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Tanguy',
            description: 'Request for Tanguy as guide',
          },
          unit_amount: Math.round(tanguyCost * 100),
        },
        quantity: 1,
      });
    }

    if (extraHourCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Extra Hour',
            description: 'Additional hour for the tour',
          },
          unit_amount: Math.round(extraHourCost * 100),
        },
        quantity: 1,
      });
    }

    if (weekendFeeCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Weekend Fee',
            description: 'Weekend booking surcharge',
          },
          unit_amount: Math.round(weekendFeeCost * 100),
        },
        quantity: 1,
      });
    }

    if (eveningFeeCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Evening Fee',
            description: 'Evening booking surcharge',
          },
          unit_amount: Math.round(eveningFeeCost * 100),
        },
        quantity: 1,
      });
    }

    // Detect if using test mode
    const isTestMode = stripeSecretKey?.startsWith('sk_test_');

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true, // Allow customers to enter discount codes
      customer_creation: 'always', // Always create customer (required for invoice)
      invoice_creation: { enabled: true }, // Enable invoice creation for all sessions
      payment_intent_data: {
        receipt_email: customerEmail, // Send receipt to customer
      },
      success_url: `${origin}/booking/payment-success`,
      cancel_url: `${origin}/booking/cancelled`,
      customer_email: customerEmail,
      metadata: {
        bookingId: bookingId.toString(),
        tourId: tourId || '',
        customerName,
        numberOfPeople: numberOfPeople.toString(),
        isManualPaymentLink: 'true',
        isExtraInvitees: isExtraInvitees ? 'true' : 'false', // Flag for extra people vs normal payment
        localBookingId: localBookingId || '',
        city: city || '',
        tourDatetime: tourDatetime || '',
        stripeMode: isTestMode ? 'test' : 'live', // Track Stripe mode
        // Fee data for webhook processing
        requestTanguy: fees?.requestTanguy ? 'true' : 'false',
        hasExtraHour: fees?.hasExtraHour ? 'true' : 'false',
        weekendFee: fees?.weekendFee ? 'true' : 'false',
        eveningFee: fees?.eveningFee ? 'true' : 'false',
        tanguyCost: tanguyCost.toString(),
        extraHourCost: extraHourCost.toString(),
        weekendFeeCost: weekendFeeCost.toString(),
        eveningFeeCost: eveningFeeCost.toString(),
        totalAmount: amount.toString(),
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    // Call n8n webhook to send the payment email
    try {
      await fetch(N8N_PAYMENT_LINK_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          tourName,
          tourId: tourId || null,
          numberOfPeople,
          amount,
          paymentUrl: session.url,
          bookingId,
          localBookingId: localBookingId || null,
          city: city || null,
          tourDatetime: tourDatetime || null,
          extra_invitees: isExtraInvitees || false, // Flag for extra people vs normal payment
          // Include fee data for n8n processing
          fees: fees ? {
            requestTanguy: fees.requestTanguy || false,
            hasExtraHour: fees.hasExtraHour || false,
            weekendFee: fees.weekendFee || false,
            eveningFee: fees.eveningFee || false,
            tanguyCost,
            extraHourCost,
            weekendFeeCost,
            eveningFeeCost,
            totalAmount: amount,
          } : null,
          // Also send fee breakdown separately for easier n8n access
          tanguyCost,
          extraHourCost,
          weekendFeeCost,
          eveningFeeCost,
          baseTourPrice,
        }),
      });
      console.log('Payment webhook sent successfully');
    } catch (webhookErr) {
      console.error('Failed to send payment webhook:', webhookErr);
      // Don't fail the request - the session was created, just webhook failed
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentUrl: session.url,
      message: 'Payment created and email sent',
    });
  } catch (error) {
    console.error('Error in send-payment-link API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
