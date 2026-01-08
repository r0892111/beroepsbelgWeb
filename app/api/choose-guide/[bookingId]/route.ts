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

export async function GET(
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

    const supabase = getSupabaseServer();

    // Fetch the booking with selectedGuides
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, selectedGuides, tour_id, city, tour_datetime')
      .eq('id', bookingIdNum)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Extract guide IDs and status from selectedGuides array
    // selectedGuides is jsonb[], format: [{id, status?, offeredAt?, respondedAt?}, ...]
    interface GuideStatus {
      id: number;
      status?: 'offered' | 'declined' | 'accepted';
      offeredAt?: string;
      respondedAt?: string;
    }
    
    let guideStatuses: GuideStatus[] = [];
    let guideIds: number[] = [];
    
    if (booking.selectedGuides && Array.isArray(booking.selectedGuides)) {
      guideStatuses = booking.selectedGuides
        .map((item: any) => {
          // If it's an object with an id field
          if (typeof item === 'object' && item !== null && 'id' in item) {
            return {
              id: parseInt(item.id, 10),
              status: item.status,
              offeredAt: item.offeredAt,
              respondedAt: item.respondedAt,
            };
          }
          // If it's already a number or string number
          if (typeof item === 'number') {
            return { id: item };
          }
          if (typeof item === 'string') {
            return { id: parseInt(item, 10) };
          }
          return null;
        })
        .filter((item: any): item is GuideStatus => item !== null && !isNaN(item.id));
      
      guideIds = guideStatuses.map(g => g.id);
    }

    // Fetch guide details for each guide ID
    let guides: any[] = [];
    if (guideIds.length > 0) {
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides_temp')
        .select('id, name, cities, languages, tour_types, content, phonenumber, Email, tours_done')
        .in('id', guideIds);

      if (!guidesError && guidesData) {
        // Merge guide details with status info
        guides = guidesData.map((guide: any) => {
          const statusInfo = guideStatuses.find(gs => gs.id === guide.id);
          return {
            ...guide,
            selectionStatus: statusInfo?.status || null, // null = available
            offeredAt: statusInfo?.offeredAt || null,
            respondedAt: statusInfo?.respondedAt || null,
          };
        });
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        tour_id: booking.tour_id,
        city: booking.city,
        tour_datetime: booking.tour_datetime,
      },
      guides,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

