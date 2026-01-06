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

      const supabaseServer = getSupabaseServer();
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('isAdmin')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return { isAdmin: false, userId: user.id };
      }

      return { isAdmin: profile.isAdmin === true, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

// Test GoedGepickt API connection
async function testGoedGepicktConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://account.goedgepickt.nl/api/fulfilment/v1/products?perPage=1&page=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.errorMessage || `API returned status ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to GoedGepickt API',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(request);
    if (!isAdmin || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServer();
    const { data: profile } = await supabase
      .from('profiles')
      .select('goedgepickt_api_key')
      .eq('id', userId)
      .single();

    const hasApiKey = !!(profile?.goedgepickt_api_key);

    return NextResponse.json({
      connected: hasApiKey,
      hasApiKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(request);
    if (!isAdmin || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { apiKey, action } = body;

    if (action === 'test') {
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key is required' },
          { status: 400 }
        );
      }

      const testResult = await testGoedGepicktConnection(apiKey);
      return NextResponse.json(testResult);
    }

    if (action === 'save') {
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key is required' },
          { status: 400 }
        );
      }

      // Test the API key before saving
      const testResult = await testGoedGepicktConnection(apiKey);
      if (!testResult.success) {
        return NextResponse.json(
          { error: testResult.error || 'Invalid API key' },
          { status: 400 }
        );
      }

      // Save the API key
      const supabase = getSupabaseServer();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ goedgepickt_api_key: apiKey })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to save API key' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const supabase = getSupabaseServer();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ goedgepickt_api_key: null })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to delete API key' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

