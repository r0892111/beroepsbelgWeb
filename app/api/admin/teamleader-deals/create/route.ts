import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// The specific profile UUID that has the TeamLeader tokens
const TEAMLEADER_PROFILE_UUID = 'd20a39c7-7b1d-4819-bb76-f7ba6ee099e0';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header to verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create Supabase client with service role for accessing tokens
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('isAdmin, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || (!profile?.isAdmin && !profile?.is_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch the TeamLeader tokens from the designated profile
    const { data: tlProfile, error: tlError } = await supabase
      .from('profiles')
      .select('access_token_tl, refresh_token_tl')
      .eq('id', TEAMLEADER_PROFILE_UUID)
      .single();

    if (tlError || !tlProfile?.access_token_tl) {
      return NextResponse.json({
        error: 'TeamLeader not connected',
        details: 'No TeamLeader access token found'
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, customerId, customerType, value, currency = 'EUR' } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create deal in TeamLeader API
    const response = await fetch('https://api.focus.teamleader.eu/deals.add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${tlProfile.access_token_tl}`
      },
      body: JSON.stringify({
        title,
        ...(customerId && customerType && {
          customer: {
            type: customerType, // 'company' or 'contact'
            id: customerId
          }
        }),
        ...(value && {
          weighted_value: {
            amount: value,
            currency: currency
          }
        })
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TeamLeader API error:', response.status, errorText);

      // If unauthorized, the token might be expired
      if (response.status === 401) {
        return NextResponse.json({
          error: 'TeamLeader token expired',
          details: 'Please reconnect TeamLeader integration'
        }, { status: 401 });
      }

      return NextResponse.json({
        error: 'Failed to create deal in TeamLeader',
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({ 
      success: true,
      deal: {
        id: data.data.id,
        title: data.data.title || title
      }
    });
  } catch (error) {
    console.error('Error creating TeamLeader deal:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
