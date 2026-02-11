import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nowBrussels } from '@/lib/utils/timezone';

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
        .select('isAdmin, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true || profile.is_admin === true;
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

async function triggerWebhook(bookingId: string, selectedGuideIds: number[]) {
  try {
    // Trigger webhook for each guide
    const results = await Promise.all(
      selectedGuideIds.map(guideId =>
        fetch('https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a9f', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            booking_id: bookingId,
            guide_id: guideId,
          }),
        }).then(res => res.ok)
      )
    );
    return results.every(result => result === true);
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
    // Support both single guideId (backward compatibility) and guideIds array
    const { guideId, guideIds } = body;

    let selectedGuideIds: number[] = [];
    
    if (guideIds && Array.isArray(guideIds)) {
      // New format: array of guide IDs
      selectedGuideIds = guideIds.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
    } else if (guideId) {
      // Backward compatibility: single guide ID
      const guideIdNum = parseInt(String(guideId), 10);
      if (!isNaN(guideIdNum)) {
        selectedGuideIds = [guideIdNum];
      }
    }

    if (selectedGuideIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one guide ID is required' },
        { status: 400 }
      );
    }

    // Verify booking exists and get selectedGuides
    const supabase = getSupabaseServer();
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, selectedGuides, guide_id, guide_ids')
      .eq('id', bookingIdNum)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update selectedGuides: mark all offered guides with status 'offered'
    // selectedGuides format: [{id, status?, offeredAt?, respondedAt?}, ...]
    // status: undefined = available, 'offered' = waiting for response, 'declined', 'accepted'
    let updatedSelectedGuides = booking.selectedGuides || [];
    const foundGuideIds = new Set<number>();
    
    if (Array.isArray(updatedSelectedGuides)) {
      updatedSelectedGuides = updatedSelectedGuides.map((item: any) => {
        // Extract guide ID from different formats
        let itemId: number | null = null;
        if (typeof item === 'object' && item !== null && 'id' in item) {
          itemId = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
        } else if (typeof item === 'number') {
          itemId = item;
        } else if (typeof item === 'string') {
          itemId = parseInt(item, 10);
        }
        
        // If this guide is being offered, update their status
        if (itemId !== null && selectedGuideIds.includes(itemId)) {
          foundGuideIds.add(itemId);
          return {
            id: itemId,
            status: 'offered',
            offeredAt: nowBrussels(),
          };
        }
        
        // Keep other guides as objects with id (normalize format)
        if (typeof item === 'object' && item !== null) {
          return item;
        }
        return { id: itemId };
      });
    }
    
    // Add any guides that weren't in selectedGuides
    selectedGuideIds.forEach(guideIdNum => {
      if (!foundGuideIds.has(guideIdNum)) {
        updatedSelectedGuides.push({
          id: guideIdNum,
          status: 'offered',
          offeredAt: nowBrussels(),
        });
      }
    });

    // Trigger webhook for all selected guides
    const webhookSuccess = await triggerWebhook(bookingId, selectedGuideIds);

    if (!webhookSuccess) {
      return NextResponse.json(
        { error: 'Failed to trigger webhook' },
        { status: 500 }
      );
    }

    // Get existing guide_ids or fall back to guide_id
    const existingGuideIds = booking.guide_ids && booking.guide_ids.length > 0 
      ? booking.guide_ids 
      : booking.guide_id 
        ? [booking.guide_id] 
        : [];
    
    // Add new guides to existing ones (avoid duplicates)
    const combinedIds = [...existingGuideIds, ...selectedGuideIds];
    const allGuideIds = Array.from(new Set(combinedIds));
    
    // Update booking: if only one guide total, set guide_id; otherwise set guide_ids array
    const updateData: any = {
      selectedGuides: updatedSelectedGuides,
    };

    if (allGuideIds.length === 1) {
      // Single guide: update guide_id
      updateData.guide_id = allGuideIds[0];
      updateData.guide_ids = null; // Clear array if only one guide
    } else {
      // Multiple guides: update guide_ids array
      updateData.guide_ids = allGuideIds;
      // Keep guide_id as first guide for backward compatibility
      updateData.guide_id = allGuideIds[0];
    }

    const { error: updateError } = await supabase
      .from('tourbooking')
      .update(updateData)
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

