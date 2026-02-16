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
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Gift card code is required' },
        { status: 400 }
      );
    }

    // Normalize code (remove spaces and dashes, convert to uppercase)
    const normalizedCode = code.trim().toUpperCase().replace(/[-\s]/g, '');

    const supabase = getSupabaseServer();

    // Try exact match first (in case code is stored without dashes)
    const { data: exactMatch, error: exactError } = await supabase
      .from('gift_cards')
      .select('code, initial_amount, current_balance, currency, status, expires_at, last_used_at, purchased_at')
      .eq('code', normalizedCode)
      .maybeSingle();
    
    // If not found, try normalized comparison (codes stored with dashes)
    let giftCard = exactMatch;
    let error = exactError;
    if (!giftCard && !error) {
      const { data: allGiftCards, error: fetchError } = await supabase
        .from('gift_cards')
        .select('code, initial_amount, current_balance, currency, status, expires_at, last_used_at, purchased_at');
      
      if (!fetchError && allGiftCards) {
        const found = allGiftCards.find(gc => {
          const storedNormalized = gc.code.replace(/[-\s]/g, '').toUpperCase();
          return storedNormalized === normalizedCode;
        });
        giftCard = found || null;
      }
    }

    if (error) {
      // Error checking gift card balance
      return NextResponse.json(
        { error: 'Failed to check balance' },
        { status: 500 }
      );
    }

    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: giftCard.code,
      currentBalance: parseFloat(giftCard.current_balance.toString()),
      initialAmount: parseFloat(giftCard.initial_amount.toString()),
      currency: giftCard.currency,
      status: giftCard.status,
      expiresAt: giftCard.expires_at,
      lastUsed: giftCard.last_used_at,
      purchasedAt: giftCard.purchased_at,
    });
  } catch (error) {
    console.error('Error checking gift card balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
