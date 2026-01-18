import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// The specific profile UUID that has the TeamLeader tokens
const TEAMLEADER_PROFILE_UUID = 'd20a39c7-7b1d-4819-bb76-f7ba6ee099e0';

export const dynamic = 'force-dynamic';

interface TeamLeaderDeal {
  id: string;
  title: string;
  reference?: string;
  status: string;
  weighted_value?: {
    amount: number;
    currency: string;
  };
  estimated_closing_date?: string;
  customer?: {
    type: string;
    id: string;
  };
  created_at?: string;
}

interface TeamLeaderResponse {
  data: TeamLeaderDeal[];
}

export async function GET(request: Request) {
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

    // Fetch deals from TeamLeader API
    // Filter for open/active deals (not won or lost)
    const response = await fetch('https://api.focus.teamleader.eu/deals.list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${tlProfile.access_token_tl}`
      },
      body: JSON.stringify({
        filter: {
          status: ['open'] // Only get active/open deals
        },
        page: {
          size: 100, // Get up to 100 deals
          number: 1
        },
        sort: [
          {
            field: 'created_at',
            order: 'desc'
          }
        ]
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
        error: 'Failed to fetch deals from TeamLeader',
        details: errorText
      }, { status: response.status });
    }

    const data: TeamLeaderResponse = await response.json();

    // Transform deals for the frontend
    const deals = data.data.map((deal: TeamLeaderDeal) => ({
      id: deal.id,
      title: deal.title,
      reference: deal.reference || null,
      status: deal.status,
      value: deal.weighted_value?.amount || null,
      currency: deal.weighted_value?.currency || 'EUR',
      estimatedClosingDate: deal.estimated_closing_date || null,
      createdAt: deal.created_at || null
    }));

    return NextResponse.json({ deals });
  } catch (error) {
    console.error('Error fetching TeamLeader deals:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
