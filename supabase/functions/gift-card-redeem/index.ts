import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { code, orderTotal, orderId, stripeOrderId } = await req.json();

    if (!code || !orderTotal) {
      return new Response(
        JSON.stringify({ error: 'Gift card code and order total are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize code
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');

    // Get the gift card with a lock (using single() ensures we get one row)
    const { data: giftCard, error: fetchError } = await supabase
      .from('gift_cards')
      .select('id, code, current_balance, status, expires_at')
      .eq('code', normalizedCode)
      .eq('status', 'active')
      .single();

    if (fetchError || !giftCard) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive gift card' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parseFloat(giftCard.current_balance.toString()) <= 0) {
      return new Response(
        JSON.stringify({ error: 'Gift card has no remaining balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (giftCard.expires_at) {
      const expiresAt = new Date(giftCard.expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Gift card has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const currentBalance = parseFloat(giftCard.current_balance.toString());
    const orderTotalNum = parseFloat(orderTotal.toString());
    
    // Calculate amount to use
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
      .eq('current_balance', currentBalance) // Optimistic locking
      .select()
      .single();

    if (updateError || !updatedCard) {
      return new Response(
        JSON.stringify({ error: 'Gift card balance was changed. Please try again.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({
        success: true,
        amountApplied: amountToUse,
        remainingBalance: newBalance,
        orderTotal: orderTotalNum - amountToUse,
        giftCardCode: normalizedCode,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error redeeming gift card:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
