import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal, orderId, stripeOrderId } = await request.json();

    if (!code || !orderTotal) {
      return NextResponse.json(
        { error: 'Gift card code and order total are required' },
        { status: 400 }
      );
    }

    // Normalize code (remove spaces and dashes, convert to uppercase)
    const normalizedCode = code.trim().toUpperCase().replace(/[-\s]/g, '');

    const supabase = getSupabaseServer();

    // Start transaction by locking the gift card row
    // First, try exact match (in case code is stored without dashes)
    let { data: giftCard, error: fetchError } = await supabase
      .from('gift_cards')
      .select('id, code, current_balance, status, expires_at')
      .eq('code', normalizedCode)
      .eq('status', 'active')
      .maybeSingle();
    
    // If not found, try normalized comparison (codes stored with dashes)
    if (!giftCard && !fetchError) {
      const { data: allGiftCards, error: fetchAllError } = await supabase
        .from('gift_cards')
        .select('id, code, current_balance, status, expires_at')
        .eq('status', 'active');
      
      if (!fetchAllError && allGiftCards) {
        const matchedCard = allGiftCards.find(gc => {
          const storedNormalized = gc.code.replace(/[-\s]/g, '').toUpperCase();
          return storedNormalized === normalizedCode;
        });
        
        if (matchedCard) {
          // Fetch the specific card by ID to get proper locking
          const { data: lockedCard, error: lockError } = await supabase
            .from('gift_cards')
            .select('id, code, current_balance, status, expires_at')
            .eq('id', matchedCard.id)
            .eq('status', 'active')
            .single();
          
          giftCard = lockedCard;
          fetchError = lockError;
        }
      }
    }

    if (fetchError || !giftCard) {
      return NextResponse.json(
        { error: 'Invalid or inactive gift card' },
        { status: 404 }
      );
    }

    if (parseFloat(giftCard.current_balance.toString()) <= 0) {
      return NextResponse.json(
        { error: 'Gift card has no remaining balance' },
        { status: 400 }
      );
    }

    // Check expiration
    if (giftCard.expires_at) {
      const expiresAt = new Date(giftCard.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Gift card has expired' },
          { status: 400 }
        );
      }
    }

    const currentBalance = parseFloat(giftCard.current_balance.toString());
    const orderTotalNum = parseFloat(orderTotal.toString());
    
    // Calculate amount to use (can't exceed balance or order total)
    const amountToUse = Math.min(currentBalance, orderTotalNum);
    const newBalance = currentBalance - amountToUse;

    // Update gift card balance atomically
    const { data: updatedCard, error: updateError } = await supabase
      .from('gift_cards')
      .update({
        current_balance: newBalance,
        last_used_at: new Date().toISOString(),
        status: newBalance <= 0 ? 'redeemed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftCard.id)
      .eq('current_balance', currentBalance) // Optimistic locking - ensure balance hasn't changed
      .select()
      .single();

    if (updateError || !updatedCard) {
      // Balance was changed by another transaction - retry or fail
      return NextResponse.json(
        { error: 'Gift card balance was changed. Please try again.' },
        { status: 409 }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('gift_card_transactions')
      .insert({
        gift_card_id: giftCard.id,
        order_id: orderId || null,
        stripe_order_id: stripeOrderId || null,
        amount_used: amountToUse,
        balance_before: currentBalance,
        balance_after: newBalance,
        transaction_type: 'redemption',
      });

    if (transactionError) {
      console.error('Failed to record gift card transaction:', transactionError);
      // Don't fail the redemption, but log the error
    }

    return NextResponse.json({
      success: true,
      amountApplied: amountToUse,
      remainingBalance: newBalance,
      orderTotal: orderTotalNum - amountToUse,
      giftCardCode: normalizedCode,
    });
  } catch (error) {
    console.error('Error redeeming gift card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
