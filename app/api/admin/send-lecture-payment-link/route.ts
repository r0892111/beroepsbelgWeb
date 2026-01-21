import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const N8N_LECTURE_PAYMENT_WEBHOOK = 'https://alexfinit.app.n8n.cloud/webhook/lecture-payment-link';

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
      lectureName,
      numberOfPeople,
      amount,
      // Additional lecture booking data to pass to webhook
      bookingData,
    } = body;

    // Validate required fields
    console.log('Lecture payment link request:', { bookingId, customerName, customerEmail, lectureName, numberOfPeople, amount });

    if (!customerName || !customerEmail || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, customerEmail, bookingId' },
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: lectureName || 'Lecture Booking',
              description: `${numberOfPeople || 1} ${(numberOfPeople || 1) === 1 ? 'person' : 'people'} - Lecture payment`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_creation: 'always', // Always create customer (required for invoice)
      invoice_creation: { enabled: true }, // Enable invoice creation for all sessions
      payment_intent_data: {
        receipt_email: customerEmail, // Send receipt to customer
      },
      success_url: `${origin}/lecture/payment-success`,
      cancel_url: `${origin}/lecture/cancelled`,
      customer_email: customerEmail,
      metadata: {
        bookingId: bookingId.toString(),
        customerName,
        numberOfPeople: (numberOfPeople || 1).toString(),
        isLecturePayment: 'true',
        lectureName: lectureName || '',
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    // Call n8n webhook to send the payment link email
    try {
      await fetch(N8N_LECTURE_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // All the booking data
          ...bookingData,
          // Payment specific fields
          bookingId,
          customerName,
          customerEmail,
          lectureName,
          numberOfPeople,
          custom_amount: amount,
          paymentUrl: session.url,
          sent_at: new Date().toISOString(),
        }),
      });
      console.log('Lecture payment link webhook sent successfully');
    } catch (webhookErr) {
      console.error('Failed to send lecture payment link webhook:', webhookErr);
      // Don't fail the request - the session was created, just webhook failed
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentUrl: session.url,
      message: 'Payment link created and email sent',
    });
  } catch (error) {
    console.error('Error in send-lecture-payment-link API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
