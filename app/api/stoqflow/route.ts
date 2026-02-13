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

// Test Stoqflow API connection by calling an edge function
// Since we can't access Supabase secrets from Next.js, we use an edge function
async function testStoqflowConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase URL not configured' };
    }

    // Call a test endpoint on the sync function (it checks env vars and API connectivity)
    // We'll send a test flag to trigger a connection check
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-stripe-to-stoqflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
      },
      body: JSON.stringify({ 
        test_connection: true,
        // Don't actually sync, just test connection
      }),
    });

    const data = await response.json().catch(() => ({}));
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Unauthorized - check Supabase function permissions' };
    }

    // The edge function returns { success, connected, error } for test_connection
    if (data.success !== undefined) {
      return {
        success: data.success,
        error: data.error,
      };
    }

    // Fallback: check if error indicates missing env vars or connection issues
    if (data.error) {
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('stoqflow') && (errorMsg.includes('env') || errorMsg.includes('missing') || errorMsg.includes('not set'))) {
        return { success: false, error: 'Stoqflow credentials not configured in Supabase secrets' };
      }
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        return { success: false, error: 'Stoqflow API endpoint not found - check base URL' };
      }
      if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
        return { success: false, error: 'Invalid Stoqflow credentials' };
      }
      return { success: false, error: data.error };
    }

    // If we get here without success/error, assume connection works
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test Stoqflow connection',
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

    // Check if Stoqflow environment variables are configured
    // Note: We can't directly access Supabase secrets from Next.js API route
    // So we check by attempting to call the edge function
    const testResult = await testStoqflowConnection();
    
    return NextResponse.json({
      connected: testResult.success,
      hasCredentials: testResult.success,
      error: testResult.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', connected: false },
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
    const { action } = body;

    if (action === 'test') {
      const testResult = await testStoqflowConnection();
      return NextResponse.json(testResult);
    }

    if (action === 'refresh') {
      // Just refresh the connection status
      const testResult = await testStoqflowConnection();
      return NextResponse.json({
        success: true,
        connected: testResult.success,
        error: testResult.error,
      });
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
