import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      items,
      customerName,
      customerEmail,
      shippingAddress,
      billingAddress,
      userId,
    } = await req.json()

    if (!items || items.length === 0) {
      throw new Error('Cart is empty')
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    const productIds = items.map((item: any) => item.productId)
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('*')
      .in('id', productIds)

    if (productsError || !products) {
      throw new Error('Failed to fetch product details')
    }

    const lineItems = items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.productId)
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`)
      }

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.title_nl || product.title_en || 'Product',
            description: product.description_nl || product.description_en || '',
            images: product.image ? [product.image] : [],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      }
    })

    const totalAmount = items.reduce((sum: number, item: any) => {
      const product = products.find((p: any) => p.id === item.productId)
      return sum + (product?.price || 0) * item.quantity
    }, 0)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/order/cancelled`,
      customer_email: customerEmail,
      shipping_address_collection: {
        allowed_countries: ['BE', 'NL', 'FR', 'DE', 'LU'],
      },
      metadata: {
        customerName,
        userId: userId || '',
      },
    })

    const orderItems = items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.productId)
      return {
        productId: item.productId,
        title: product?.title_nl || 'Product',
        quantity: item.quantity,
        price: product?.price || 0,
        image: product?.image || null,
      }
    })

    const { error: orderError } = await supabase.from('orders').insert({
      user_id: userId || null,
      stripe_session_id: session.id,
      status: 'pending',
      total_amount: totalAmount,
      currency: 'eur',
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_address: shippingAddress,
      billing_address: billingAddress || shippingAddress,
      items: orderItems,
      metadata: {},
    })

    if (orderError) {
      console.error('Error creating order:', orderError)
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})