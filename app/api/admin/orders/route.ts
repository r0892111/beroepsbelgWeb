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

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return { isAdmin: false, userId: null };
      }

      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

      // Use service role client to check profile (bypasses RLS)
      const supabaseServer = getSupabaseServer();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('isAdmin, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true || profile.is_admin === true;
      return { isAdmin, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

// GET - List all orders
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('stripe_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      checkout_session_id,
      payment_intent_id,
      customer_id,
      amount_subtotal,
      amount_total,
      currency = 'eur',
      payment_status = 'unpaid',
      status = 'pending',
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      items = [],
      metadata = {},
      total_amount,
    } = body;

    // Validate required fields
    if (!checkout_session_id || !payment_intent_id || !customer_id) {
      return NextResponse.json(
        { error: 'Missing required fields: checkout_session_id, payment_intent_id, customer_id' },
        { status: 400 }
      );
    }

    if (amount_subtotal === undefined || amount_total === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: amount_subtotal, amount_total' },
        { status: 400 }
      );
    }

    if (!customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, customer_email' },
        { status: 400 }
      );
    }

    if (!shipping_address) {
      return NextResponse.json(
        { error: 'Missing required field: shipping_address' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('stripe_orders')
      .insert({
        checkout_session_id,
        payment_intent_id,
        customer_id,
        amount_subtotal,
        amount_total,
        currency,
        payment_status,
        status,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        shipping_address,
        billing_address: billing_address || shipping_address,
        items: Array.isArray(items) ? items : [],
        metadata,
        total_amount: total_amount || (amount_total / 100),
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/admin/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
