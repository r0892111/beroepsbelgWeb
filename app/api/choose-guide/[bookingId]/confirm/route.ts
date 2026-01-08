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

async function getSupabaseClientForAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    // Try getting Authorization header first (preferred method)
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    // If we have an access token, use it directly
    if (accessToken) {
      // Use anon key client to verify token
      const supabaseAnon = await getSupabaseClientForAuth(request);
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
      
      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

      // Fetch user profile using service role for admin check
      const supabaseServer = getSupabaseServer();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('isAdmin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true;
      return { isAdmin, userId: user.id };
    }

    // Fallback: try to get token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) {
        cookies[name] = rest.join('=');
      }
    });

    // Try to get access token from cookies
    const cookieToken = cookies['sb-access-token'] || cookies['supabase-auth-token'];
    
    if (cookieToken) {
      const supabaseAnon = await getSupabaseClientForAuth(request);
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(cookieToken);

    if (authError || !user) {
      return { isAdmin: false, userId: null };
    }

    // Fetch user profile using service role for admin check
    const supabaseServer = getSupabaseServer();
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('isAdmin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, userId: user.id };
    }

    const isAdmin = profile.isAdmin === true;
    return { isAdmin, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

async function triggerWebhook(bookingId: string, selectedGuideId: number) {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a9f', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        booking_id: bookingId,
        guide_id: selectedGuideId,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { bookingId } = await params;
    const bookingIdNum = parseInt(bookingId, 10);

    if (isNaN(bookingIdNum)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { guideId } = body;

    if (!guideId) {
      return NextResponse.json(
        { error: 'Guide ID is required' },
        { status: 400 }
      );
    }

    const guideIdNum = parseInt(String(guideId), 10);
    if (isNaN(guideIdNum)) {
      return NextResponse.json(
        { error: 'Invalid guide ID' },
        { status: 400 }
      );
    }

    // Verify booking exists and get selectedGuides
    const supabase = getSupabaseServer();
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, selectedGuides')
      .eq('id', bookingIdNum)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update selectedGuides: mark the offered guide with status 'offered'
    // selectedGuides format: [{id, status?, offeredAt?, respondedAt?}, ...]
    // status: undefined = available, 'offered' = waiting for response, 'declined', 'accepted'
    let updatedSelectedGuides = booking.selectedGuides || [];
    let guideFoundInList = false;
    
    if (Array.isArray(updatedSelectedGuides)) {
      updatedSelectedGuides = updatedSelectedGuides.map((item: any) => {
        // Extract guide ID from different formats
        let itemId: number | null = null;
        if (typeof item === 'object' && item !== null && 'id' in item) {
          itemId = parseInt(item.id, 10);
        } else if (typeof item === 'number') {
          itemId = item;
        } else if (typeof item === 'string') {
          itemId = parseInt(item, 10);
        }
        
        // If this is the guide being offered, update their status
        if (itemId === guideIdNum) {
          guideFoundInList = true;
          return {
            id: guideIdNum,
            status: 'offered',
            offeredAt: new Date().toISOString(),
          };
        }
        
        // Keep other guides as objects with id (normalize format)
        if (typeof item === 'object' && item !== null) {
          return item;
        }
        return { id: itemId };
      });
    }
    
    // If guide wasn't in selectedGuides (e.g., manually selecting a new guide), add them
    if (!guideFoundInList) {
      updatedSelectedGuides.push({
        id: guideIdNum,
        status: 'offered',
        offeredAt: new Date().toISOString(),
      });
    }

    // Trigger webhook
    const webhookSuccess = await triggerWebhook(bookingId, guideIdNum);

    if (!webhookSuccess) {
      return NextResponse.json(
        { error: 'Failed to trigger webhook' },
        { status: 500 }
      );
    }

    // Update booking with updated selectedGuides
    // NOTE: guide_id is NOT set here - it will be set when the guide actually accepts
    // via the /api/confirm-guide/[dealId]/confirm endpoint
    const { error: updateError } = await supabase
      .from('tourbooking')
      .update({ 
        selectedGuides: updatedSelectedGuides,
      })
      .eq('id', bookingIdNum);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // Still return success if webhook worked
    }

    return NextResponse.json({
      success: true,
      message: 'Guide offer sent successfully. Waiting for guide confirmation.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

