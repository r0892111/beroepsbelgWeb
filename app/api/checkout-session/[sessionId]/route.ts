import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId || !sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Retrieve the Stripe checkout session with expanded data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [
        'line_items',
        'line_items.data.price.product',
        'total_details.breakdown',
        'discounts.promotion_code',
        'discounts.promotion_code.coupon',
      ],
    });

    // Extract relevant payment info
    const amountTotal = (session.amount_total || 0) / 100; // Convert cents to euros
    const amountSubtotal = (session.amount_subtotal || 0) / 100;
    const discountAmount = ((session.total_details?.amount_discount || 0)) / 100;

    // Get promo code info
    let promoCode: string | null = null;
    let promoDiscountPercent: number | null = null;
    if (session.discounts && session.discounts.length > 0) {
      const discount = session.discounts[0] as any;
      if (discount.promotion_code && typeof discount.promotion_code === 'object') {
        promoCode = discount.promotion_code.code || null;
        if (discount.promotion_code.coupon) {
          promoDiscountPercent = discount.promotion_code.coupon.percent_off || null;
        }
      }
    }

    // Extract line items (products purchased)
    const lineItems: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      isShipping: boolean;
    }> = [];

    if (session.line_items?.data) {
      for (const item of session.line_items.data) {
        let itemName = item.description || '';

        // Try to get name from product if description is empty
        if (!itemName && item.price && typeof item.price === 'object' && 'product' in item.price) {
          const product = item.price.product;
          if (typeof product === 'object' && product && 'name' in product) {
            itemName = product.name as string;
          }
        }

        const quantity = item.quantity || 1;
        const totalPrice = (item.amount_total || 0) / 100;
        const unitPrice = totalPrice / quantity;

        // Check if this is a shipping line item
        const isShipping = itemName.toLowerCase().includes('verzendkosten') ||
                          itemName.toLowerCase().includes('shipping') ||
                          itemName.toLowerCase().includes('freight');

        lineItems.push({
          name: itemName || 'Product',
          quantity,
          unitPrice,
          totalPrice,
          isShipping,
        });
      }
    }

    // Separate tour/products from shipping
    const tourItems = lineItems.filter(item => !item.isShipping && !item.name.toLowerCase().includes('shipping'));
    const shippingItems = lineItems.filter(item => item.isShipping);

    // Get the main tour item (usually the first non-shipping item)
    const tourItem = tourItems.find(item =>
      item.name.toLowerCase().includes('tour') ||
      item.name.toLowerCase().includes('person') ||
      item.name.toLowerCase().includes('personen') ||
      item.name.toLowerCase().includes('local stories')
    ) || tourItems[0];

    // Get upsell items (products that aren't the main tour)
    const upsellItems = tourItems.filter(item => item !== tourItem);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      customerName: session.metadata?.customerName || null,

      // Amounts
      amountTotal,
      amountSubtotal,
      discountAmount,

      // Promo code
      promoCode,
      promoDiscountPercent,

      // Tour info (from metadata if available)
      tourTitle: session.metadata?.tourTitle || null,
      numberOfPeople: session.metadata?.numberOfPeople ? parseInt(session.metadata.numberOfPeople) : null,
      bookingDate: session.metadata?.bookingDate || null,
      language: session.metadata?.language || null,

      // Line items breakdown
      tourItem: tourItem || null,
      upsellItems,
      shippingItems,

      // Raw line items for reference
      allLineItems: lineItems,
    });
  } catch (error: any) {
    console.error('Error fetching checkout session:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
