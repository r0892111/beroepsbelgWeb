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
    const supabaseServiceKey = Deno.env.get('service_api_key') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      items,
      customerName,
      customerEmail,
      shippingAddress,
      billingAddress,
      userId,
      locale = 'nl',
    } = await req.json()

    if (!items || items.length === 0) {
      throw new Error('Cart is empty')
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch products from webshop_data table using UUIDs
    const productIds = items.map((item: any) => item.productId)
    console.log('Fetching products with UUIDs:', productIds)
    
    const { data: products, error: productsError } = await supabaseClient
      .from('webshop_data')
      .select('*')
      .in('uuid', productIds)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw new Error(`Failed to fetch product details: ${productsError.message}`)
    }

    if (!products || products.length === 0) {
      console.error('No products found for UUIDs:', productIds)
      throw new Error(`No products found for the provided IDs: ${productIds.join(', ')}`)
    }

    // Log the first product to see its structure
    if (products.length > 0) {
      console.log('Sample product structure:', JSON.stringify(products[0], null, 2))
      console.log('Product UUIDs found:', products.map((p: any) => p.uuid))
    }

    if (products.length !== productIds.length) {
      const foundIds = products.map((p: any) => p.uuid)
      const missingIds = productIds.filter((id: string) => !foundIds.includes(id))
      console.warn('Some products not found. Missing:', missingIds)
      console.warn('Requested IDs:', productIds)
      console.warn('Found IDs:', foundIds)
      throw new Error(`Some products not found: ${missingIds.join(', ')}`)
    }

    console.log(`Found ${products.length} products`)

    // Build line items using Stripe price IDs if available, otherwise create price_data
    const lineItems = items.map((item: any) => {
      const product = products.find((p: any) => p.uuid === item.productId)
      if (!product) {
        console.error(`Product not found in results. Looking for: ${item.productId}`)
        console.error('Available product UUIDs:', products.map((p: any) => p.uuid))
        throw new Error(`Product not found: ${item.productId}`)
      }

      console.log(`Processing product: ${product.Name} (${product.uuid}), has Stripe price: ${!!product.stripe_price_id}`)

      // If Stripe price ID exists, use it directly (preferred)
      if (product.stripe_price_id) {
        return {
          price: product.stripe_price_id,
          quantity: item.quantity,
        }
      }

      // Fallback: create price_data if Stripe price ID is not available
      const priceStr = product['Price (EUR)']?.toString() || '0'
      const priceValue = parseFloat(priceStr.replace(',', '.')) || 0
      
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.Name || 'Product',
            description: product.Description || '',
            metadata: {
              webshop_uuid: product.uuid,
              category: product.Category || '',
            },
          },
          unit_amount: Math.round(priceValue * 100),
        },
        quantity: item.quantity,
      }
    })

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      const product = products.find((p: any) => p.uuid === item.productId)
      if (!product) return sum
      
      const priceStr = product['Price (EUR)']?.toString() || '0'
      const priceValue = parseFloat(priceStr.replace(',', '.')) || 0
      return sum + priceValue * item.quantity
    }, 0)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/${locale}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/${locale}/order/cancelled`,
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
      const product = products.find((p: any) => p.uuid === item.productId)
      const priceStr = product?.['Price (EUR)']?.toString() || '0'
      const priceValue = parseFloat(priceStr.replace(',', '.')) || 0
      
      return {
        productId: item.productId,
        title: product?.Name || 'Product',
        quantity: item.quantity,
        price: priceValue,
        stripe_product_id: product?.stripe_product_id || null,
        stripe_price_id: product?.stripe_price_id || null,
      }
    })

    // Insert order - work with existing table schema and new columns
    const orderInsert: any = {
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent as string || '',
      customer_id: customerEmail, // Use email as customer_id (existing column)
      amount_subtotal: Math.round(totalAmount * 100), // Convert to cents (existing column)
      amount_total: Math.round(totalAmount * 100), // Existing column
      currency: 'eur',
      payment_status: 'pending', // Existing column
      status: 'pending', // Will be cast to stripe_order_status enum by database
    };

    // Add new columns (will be added by migration)
    if (userId) {
      orderInsert.user_id = userId;
    }
    orderInsert.customer_name = customerName;
    orderInsert.customer_email = customerEmail;
    if (shippingAddress) {
      orderInsert.shipping_address = shippingAddress;
    }
    if (billingAddress || shippingAddress) {
      orderInsert.billing_address = billingAddress || shippingAddress;
    }
    if (orderItems && orderItems.length > 0) {
      orderInsert.items = orderItems;
    }
    orderInsert.metadata = { customerName, customerEmail, userId: userId || null };
    orderInsert.total_amount = totalAmount; // For compatibility with account page

    const { data: orderData, error: orderError } = await supabase
      .from('stripe_orders')
      .insert(orderInsert)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      // Don't throw - still return checkout URL even if order creation fails
      // The webhook might create it later
    } else {
      console.log('Order created successfully:', orderData?.id)
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