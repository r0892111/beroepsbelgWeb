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

    // Normalize code (remove spaces, convert to uppercase)
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');

    const supabase = getSupabaseServer();

    // Check if gift card exists and is active
    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('code, initial_amount, current_balance, currency, status, expires_at')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (error) {
      console.error('Error validating gift card:', error);
      return NextResponse.json(
        { error: 'Failed to validate gift card' },
        { status: 500 }
      );
    }

    if (!giftCard) {
      return NextResponse.json(
        { error: 'Invalid gift card code' },
        { status: 404 }
      );
    }

    if (giftCard.status !== 'active') {
      return NextResponse.json(
        { error: `Gift card is ${giftCard.status}` },
        { status: 400 }
      );
    }

    if (parseFloat(giftCard.current_balance.toString()) <= 0) {
      return NextResponse.json(
        { error: 'Gift card has no remaining balance' },
        { status: 400 }
      );
    }

    // Check expiration if applicable
    if (giftCard.expires_at) {
      const expiresAt = new Date(giftCard.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Gift card has expired' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      giftCard: {
        code: giftCard.code,
        currentBalance: parseFloat(giftCard.current_balance.toString()),
        initialAmount: parseFloat(giftCard.initial_amount.toString()),
        currency: giftCard.currency,
      },
    });
  } catch (error) {
    console.error('Error validating gift card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
