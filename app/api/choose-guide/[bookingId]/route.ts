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

  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies[name];
      },
      set(name: string, value: string, options: any) {
        // Not needed for read-only operations
      },
      remove(name: string, options: any) {
        // Not needed for read-only operations
      },
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
        console.error('Auth error with token:', authError);
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
        console.error('Profile error:', profileError);
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true;
      console.log('Admin check (token):', { userId: user.id, isAdmin, isAdminField: profile.isAdmin });
      return { isAdmin, userId: user.id };
    }

    // Fallback: try getUser() with cookies
    const supabase = await getSupabaseClientForAuth(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error (cookies):', authError);
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
      console.error('Profile error:', profileError);
      return { isAdmin: false, userId: user.id };
    }

    const isAdmin = profile.isAdmin === true;
    console.log('Admin check (cookies):', { userId: user.id, isAdmin, isAdminField: profile.isAdmin });
    return { isAdmin, userId: user.id };
  } catch (error) {
    console.error('Error checking admin access:', error);
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

    // Extract guide IDs from selectedGuides array
    // selectedGuides is jsonb[], so it could be an array of objects or IDs
    let guideIds: number[] = [];
    
    if (booking.selectedGuides && Array.isArray(booking.selectedGuides)) {
      guideIds = booking.selectedGuides
        .map((item: any) => {
          // If it's an object with an id field, extract it
          if (typeof item === 'object' && item !== null && 'id' in item) {
            return parseInt(item.id, 10);
          }
          // If it's already a number or string number
          if (typeof item === 'number') {
            return item;
          }
          if (typeof item === 'string') {
            return parseInt(item, 10);
          }
          return null;
        })
        .filter((id: any): id is number => id !== null && !isNaN(id));
    }

    // Fetch guide details for each guide ID
    let guides: any[] = [];
    if (guideIds.length > 0) {
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides_temp')
        .select('id, name, cities, languages, tour_types, content, phonenumber, Email, tours_done')
        .in('id', guideIds);

      if (guidesError) {
        console.error('Error fetching guides:', guidesError);
      } else {
        guides = guidesData || [];
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
    console.error('Error in choose-guide API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

