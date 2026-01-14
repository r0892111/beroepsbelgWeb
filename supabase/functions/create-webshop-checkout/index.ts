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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      userId,
      locale = 'nl',
    } = await req.json()

    if (!items || items.length === 0) {
      throw new Error('Cart is empty')
    }

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

    // Calculate product total
    const productTotal = items.reduce((sum: number, item: any) => {
      const product = products.find((p: any) => p.uuid === item.productId)
      if (!product) return sum
      
      const priceStr = product['Price (EUR)']?.toString() || '0'
      const priceValue = parseFloat(priceStr.replace(',', '.')) || 0
      return sum + priceValue * item.quantity
    }, 0)

    // Freight costs constants
    const FREIGHT_COST_BE = 7.50;
    const FREIGHT_COST_INTERNATIONAL = 14.99;
    const FREE_SHIPPING_THRESHOLD = 150.00; // Free shipping for orders over €150

    // Calculate shipping cost based on country and order total
    let shippingCost = 0;
    
    // Free shipping if order total (without shipping) is €150 or more
    if (productTotal >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
      console.log('Free shipping applied - order total exceeds €150:', { productTotal });
    } else {
      // Calculate shipping based on country
      if (shippingAddress && shippingAddress.country) {
        const country = shippingAddress.country.toLowerCase();
        if (country === 'belgië' || country === 'belgium' || country === 'belgique' || country === 'belgien') {
          shippingCost = FREIGHT_COST_BE;
        } else {
          shippingCost = FREIGHT_COST_INTERNATIONAL;
        }
      } else {
        // Default to international if no country provided
        shippingCost = FREIGHT_COST_INTERNATIONAL;
      }
    }

    // Add shipping as a line item (only if there's a cost, or show as free if over threshold)
    if (productTotal >= FREE_SHIPPING_THRESHOLD) {
      // Show free shipping as a line item for transparency
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Verzendkosten (GRATIS - bestelling boven €150)',
          },
          unit_amount: 0, // Free shipping
        },
        quantity: 1,
      });
      console.log('Added free shipping to line items (order over €150)');
    } else if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: shippingAddress?.country === 'België' || shippingAddress?.country === 'Belgium'
              ? 'Verzendkosten (België)'
              : 'Verzendkosten (Internationaal)',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
      console.log('Added shipping cost to line items:', {
        country: shippingAddress?.country,
        cost: shippingCost
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true, // Enable discount/coupon code field
      success_url: `${req.headers.get('origin')}/${locale}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/${locale}/order/cancelled`,
      customer_email: customerEmail,
      shipping_address_collection: {
        allowed_countries: ['BE', 'NL', 'FR', 'DE', 'LU'],
      },
      metadata: {
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        userId: userId || '',
        order_type: 'webshop', // To distinguish from tour bookings in webhook
      },
    })

    // Order will be created by stripe-webhook after successful payment
    console.log('Checkout session created:', session.id)

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