import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
});

const N8N_WEBSHOP_PAYMENT_LINK_WEBHOOK = 'https://alexfinit.app.n8n.cloud/webhook/webshop-payment-link';

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

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { isAdmin: false, userId: null };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false, userId: null };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { isAdmin: false, userId: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('isAdmin, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, userId: user.id };
    }

    const isAdmin = profile.isAdmin === true || profile.is_admin === true;
    return { isAdmin, userId: user.id };
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
      orderId,
      checkoutSessionId,
      customerName,
      customerEmail,
      amount, // Amount in euros
      items, // Array of order items
      shippingAddress,
    } = body;

    // Validate required fields
    if (!customerName || !customerEmail || !orderId || !checkoutSessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, customerEmail, orderId, checkoutSessionId' },
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

    // Build line items from order items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (items && Array.isArray(items)) {
      for (const item of items) {
        // Skip shipping items (they'll be added separately if needed)
        if (item.title?.toLowerCase().includes('verzendkosten') || 
            item.title?.toLowerCase().includes('shipping')) {
          continue;
        }

        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.title || 'Product',
            },
            unit_amount: Math.round((item.price || 0) * 100), // Convert to cents
          },
          quantity: item.quantity || 1,
        });
      }

      // Add shipping if there's a shipping address and shipping cost
      const shippingItem = items.find((item: any) => 
        item.title?.toLowerCase().includes('verzendkosten') || 
        item.title?.toLowerCase().includes('shipping')
      );
      
      if (shippingItem && shippingAddress) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: shippingItem.title || 'Shipping',
            },
            unit_amount: Math.round((shippingItem.price || 0) * 100),
          },
          quantity: 1,
        });
      }
    }

    // If no line items, create a single item for the total amount
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Webshop Order',
            description: `Order #${orderId}`,
          },
          unit_amount: Math.round(amount * 100),
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
      allow_promotion_codes: true,
      customer_creation: 'always',
      invoice_creation: { enabled: true },
      payment_intent_data: {
        receipt_email: customerEmail,
      },
      success_url: `${origin}/nl/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/nl/webshop`,
      customer_email: customerEmail,
      metadata: {
        orderId: orderId.toString(),
        checkoutSessionId: checkoutSessionId,
        customerName,
        isManualPaymentLink: 'true',
        isWebshopOrder: 'true',
        stripeMode: isTestMode ? 'test' : 'live',
      },
    });

    // Only collect shipping address if provided
    if (shippingAddress && shippingAddress.street) {
      session.shipping_address_collection = {
        allowed_countries: ['BE', 'NL', 'FR', 'DE', 'LU', 'GB', 'ES', 'IT', 'PT', 'AT', 'CH'],
      };
    }

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    // Update the order with the new checkout session ID
    const supabase = getSupabaseServer();
    const { data: existingOrder } = await supabase
      .from('stripe_orders')
      .select('metadata')
      .eq('id', orderId)
      .single();
    
    await supabase
      .from('stripe_orders')
      .update({
        checkout_session_id: session.id,
        metadata: {
          ...(existingOrder?.metadata || {}),
          paymentLinkSent: true,
          paymentLinkSessionId: session.id,
        }
      })
      .eq('id', orderId);

    // Call n8n webhook to send the payment email
    try {
      await fetch(N8N_WEBSHOP_PAYMENT_LINK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerName,
          customerEmail,
          paymentUrl: session.url,
          amount,
          items,
        }),
      });
    } catch (webhookErr) {
      console.error('Failed to send webshop payment webhook:', webhookErr);
      // Don't fail the request if webhook fails
    }

    return NextResponse.json({
      success: true,
      paymentUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error in send-webshop-payment-link API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
