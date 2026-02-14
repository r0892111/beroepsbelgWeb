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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      items, // Array of { productId, quantity, customPrice?, isGiftCard? }
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      userId,
      locale = 'nl',
      isGiftCardOnly = false,
      giftCardCode = null,
      giftCardDiscount = 0, // Discount amount to apply from gift card
    } = await req.json()

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided')
    }
    if (!customerName || !customerEmail) {
      throw new Error('Customer name and email are required')
    }
    // Shipping address only required for non-gift-card orders
    if (!isGiftCardOnly && !shippingAddress) {
      throw new Error('Shipping address is required')
    }

    console.log('Received webshop checkout request:', {
      itemCount: items.length,
      customerEmail,
      locale,
    })

    // Fetch products from webshop_data
    const productIds = items.map((item: { productId: string }) => item.productId)
    const { data: products, error: productsError } = await supabase
      .from('webshop_data')
      .select('uuid, Name, Description, "Price (EUR)", Category, stripe_product_id, stripe_price_id, product_images, is_giftcard')
      .in('uuid', productIds)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw new Error('Failed to fetch products')
    }

    if (!products || products.length === 0) {
      throw new Error('No products found')
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.uuid, p]))

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const orderItems: any[] = []
    let subtotal = 0

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        console.warn(`Product not found: ${item.productId}`)
        continue
      }

      const quantity = item.quantity || 1
      // Check if this is a gift card based on category or is_giftcard flag from database
      const isGiftCard = item.isGiftCard || product.Category === 'GiftCard' || product.is_giftcard === true
      
      // Use custom price for gift cards, otherwise use product price
      let priceValue: number
      if (isGiftCard && item.customPrice && item.customPrice >= 10) {
        priceValue = item.customPrice
      } else {
        priceValue = parseFloat(product['Price (EUR)']?.toString().replace(',', '.') || '0')
      }

      // For gift cards with custom price, always use price_data (not existing stripe_price_id)
      if (isGiftCard && item.customPrice) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product: product.stripe_product_id, // Use existing Stripe product
            unit_amount: Math.round(priceValue * 100),
          },
          quantity: quantity,
        })
      } else if (product.stripe_price_id) {
        // Use existing Stripe price
        lineItems.push({
          price: product.stripe_price_id,
          quantity: quantity,
        })
      } else {
        // Create price data inline (fallback if no Stripe price exists)
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.Name || 'Product',
              description: product.Description || undefined,
            },
            unit_amount: Math.round(priceValue * 100),
          },
          quantity: quantity,
        })
      }

      // Track for order record
      const itemTotal = priceValue * quantity
      subtotal += itemTotal
      orderItems.push({
        productId: product.uuid,
        name: product.Name,
        description: product.Description,
        price: priceValue,
        quantity: quantity,
        total: itemTotal,
        image: product.product_images?.[0] || null,
        isGiftCard,
      })

      console.log('Added product to checkout:', {
        name: product.Name,
        price: priceValue,
        quantity: quantity,
        hasStripePrice: !!product.stripe_price_id,
        isGiftCard,
        customPrice: item.customPrice,
      })
    }

    if (lineItems.length === 0) {
      throw new Error('No valid products to checkout')
    }

    // Calculate shipping cost - no shipping for gift card only orders
    const FREIGHT_COST_BE = 7.50
    const FREIGHT_COST_INTERNATIONAL = 14.99
    let shippingCost = 0

    if (!isGiftCardOnly) {
      const isBelgium = shippingAddress?.country === 'België' || shippingAddress?.country === 'Belgium'
      shippingCost = isBelgium ? FREIGHT_COST_BE : FREIGHT_COST_INTERNATIONAL

      // Add shipping as a line item only for physical products
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: isBelgium ? 'Verzendkosten (België)' : 'Verzendkosten (Internationaal)',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      })
    }

    // Apply gift card discount if provided
    const giftCardDiscountAmount = giftCardCode && giftCardDiscount > 0 ? parseFloat(giftCardDiscount.toString()) : 0;
    const totalBeforeDiscount = subtotal + shippingCost;
    const finalTotal = Math.max(0, totalBeforeDiscount - giftCardDiscountAmount);

    // Add gift card discount as an informational line item (so it appears in the item list)
    if (giftCardDiscountAmount > 0 && giftCardCode) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Gift Card Discount (${giftCardCode})`,
            description: `Applied gift card discount`,
          },
          unit_amount: 0, // Zero cost - actual discount applied via coupon below
        },
        quantity: 1,
      });
      console.log('Added gift card discount line item (informational):', {
        code: giftCardCode,
        discountAmount: giftCardDiscountAmount,
      });
    }

    // Create and apply gift card discount as a Stripe coupon (so it appears on invoice)
    let giftCardCouponId: string | null = null;
    if (giftCardDiscountAmount > 0 && giftCardCode) {
      try {
        // Calculate discount percentage based on total before discount
        // We'll use a fixed amount coupon instead of percentage for accuracy
        const discountAmountCents = Math.round(giftCardDiscountAmount * 100);
        
        // Create a coupon with the exact discount amount
        // Use a unique name based on gift card code to avoid conflicts
        const couponName = `giftcard_${giftCardCode}_${Date.now()}`;
        
        const coupon = await stripe.coupons.create({
          name: `Gift Card ${giftCardCode}`,
          amount_off: discountAmountCents,
          currency: 'eur',
          duration: 'once',
          metadata: {
            gift_card_code: giftCardCode,
            type: 'gift_card_discount',
          },
        });
        
        giftCardCouponId = coupon.id;
        
        console.log('Created gift card discount coupon:', {
          couponId: giftCardCouponId,
          code: giftCardCode,
          discountAmount: giftCardDiscountAmount,
          discountAmountCents,
        });
      } catch (couponError) {
        console.error('Failed to create gift card discount coupon:', couponError);
        // Fall back to proportional discount if coupon creation fails
        console.warn('Falling back to proportional discount method');
        
        // Calculate total from all line items (including those with Stripe price IDs)
        let totalPriceDataItems = 0;
        const priceDataItems: any[] = [];
        
        for (const item of lineItems) {
          if (item.price_data && item.price_data.unit_amount !== undefined) {
            const itemTotal = item.price_data.unit_amount * item.quantity;
            totalPriceDataItems += itemTotal;
            priceDataItems.push(item);
          }
        }
        
        // If we have price_data items, apply discount proportionally
        if (totalPriceDataItems > 0 && totalPriceDataItems >= Math.round(giftCardDiscountAmount * 100)) {
          const discountAmountCents = Math.round(giftCardDiscountAmount * 100);
          const totalAfterDiscount = Math.max(0, totalPriceDataItems - discountAmountCents);
          const discountRatio = totalAfterDiscount / totalPriceDataItems;
          
          // Apply discount proportionally to each price_data item
          for (const item of priceDataItems) {
            const originalAmount = item.price_data.unit_amount;
            const discountedAmount = Math.round(originalAmount * discountRatio);
            item.price_data.unit_amount = Math.max(0, discountedAmount);
          }
        }
      }
    }

    console.log('Checkout summary:', {
      subtotal,
      shippingCost,
      giftCardDiscount: giftCardDiscountAmount,
      totalBeforeDiscount,
      finalTotal,
      lineItemCount: lineItems.length,
    })

    // Create Stripe checkout session
    // Skip shipping address collection for gift card only orders
    const sessionConfig: any = {
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: lineItems,
      mode: 'payment',
      customer_creation: 'always', // Always create customer (required for invoice)
      invoice_creation: { enabled: true }, // Enable invoice creation for all sessions
      payment_intent_data: {
        receipt_email: customerEmail, // Send receipt to customer
      },
      success_url: `${req.headers.get('origin')}/${locale}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/${locale}/webshop`,
      customer_email: customerEmail,
      metadata: {
        order_type: isGiftCardOnly ? 'giftcard' : 'webshop',
        customerName,
        customerPhone: customerPhone || '',
        userId: userId || '',
        locale,
        itemCount: orderItems.length.toString(),
        isGiftCardOnly: isGiftCardOnly.toString(),
        // Include gift card information for webhook processing
        giftCardItems: isGiftCardOnly ? JSON.stringify(orderItems.filter(item => item.isGiftCard).map(item => ({
          amount: item.total,
          quantity: item.quantity,
        }))) : '',
        // Include gift card code for redemption (if applied at checkout)
        giftCardCode: giftCardCode || '',
        giftCardDiscount: giftCardDiscountAmount > 0 ? giftCardDiscountAmount.toString() : '',
        giftCardCouponId: giftCardCouponId || '',
      },
    }

    // Apply gift card discount coupon OR allow promotion codes (Stripe only allows one)
    if (giftCardCouponId) {
      sessionConfig.discounts = [{
        coupon: giftCardCouponId,
      }];
      console.log('Applied gift card discount coupon to session:', giftCardCouponId);
    } else {
      // Only allow promotion codes if no gift card discount is applied
      sessionConfig.allow_promotion_codes = true;
    }

    // Only collect shipping address for physical products
    if (!isGiftCardOnly) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['BE', 'NL', 'FR', 'DE', 'LU', 'GB', 'ES', 'IT', 'PT', 'AT', 'CH'],
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('Created Stripe checkout session:', session.id)

    // Note: Order is created by stripe-webhook after payment completes
    // This ensures we have payment_intent_id and customer_id which are required fields

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
    console.error('Error creating webshop checkout session:', error)
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
