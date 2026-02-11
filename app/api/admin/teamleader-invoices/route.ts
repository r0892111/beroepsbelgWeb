import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Always use Tanguy's TeamLeader integration for testing
const TANGUY_EMAIL = 'tanguy@beroepsbelg.be';

export const dynamic = 'force-dynamic';

interface TeamLeaderInvoice {
  id: string;
  invoice_number?: string;
  title?: string;
  status?: string;
  total?: {
    amount: number;
    currency: string;
  };
  customer?: {
    type: string;
    id: string;
  };
  created_at?: string;
  due_date?: string;
}

interface TeamLeaderResponse {
  data: TeamLeaderInvoice[];
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

    // Always fetch Tanguy's TeamLeader tokens (for testing - regardless of who is logged in)
    const { data: tlProfile, error: tlError } = await supabase
      .from('profiles')
      .select('access_token_tl, refresh_token_tl, email')
      .eq('email', TANGUY_EMAIL)
      .single();

    if (tlError) {
      console.error('Error fetching Tanguy profile:', tlError);
      return NextResponse.json({
        error: 'TeamLeader not connected',
        details: `Could not find profile for ${TANGUY_EMAIL}: ${tlError.message}`
      }, { status: 400 });
    }

    if (!tlProfile?.access_token_tl) {
      return NextResponse.json({
        error: 'TeamLeader not connected',
        details: `No TeamLeader access token found for ${TANGUY_EMAIL}. Please connect TeamLeader integration.`
      }, { status: 400 });
    }

    // Fetch invoices from TeamLeader API
    // Filter for invoices that can be linked to bookings (draft, outstanding, matched)
    const response = await fetch('https://api.focus.teamleader.eu/invoices.list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${tlProfile.access_token_tl}`
      },
      body: JSON.stringify({
        filter: {
          // Get invoices that are draft, outstanding (unpaid), or matched (payment matched)
          // This includes invoices that are still relevant for booking tracking
          status: ['draft', 'outstanding', 'matched']
        },
        page: {
          size: 100, // Get up to 100 invoices
          number: 1
        },
        sort: [
          {
            field: 'invoice_number',
            order: 'desc'
          }
        ],
        includes: 'late_fees' // Include late fees information if available
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
        error: 'Failed to fetch invoices from TeamLeader',
        details: errorText
      }, { status: response.status });
    }

    const data: TeamLeaderResponse = await response.json();

    // Transform invoices for the frontend
    const invoices = data.data.map((invoice: TeamLeaderInvoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number || null,
      title: invoice.title || `Invoice ${invoice.invoice_number || invoice.id}`,
      status: invoice.status || null,
      total: invoice.total?.amount || null,
      currency: invoice.total?.currency || 'EUR',
      customer: invoice.customer || null,
      createdAt: invoice.created_at || null,
      dueDate: invoice.due_date || null
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching TeamLeader invoices:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
