import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function getSupabaseClientForAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const supabaseAnon = await getSupabaseClientForAuth(request);
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

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

/**
 * GET /api/local-tours-bookings/admin
 * Fetches all local tours bookings for admin (including unavailable dates)
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get('tourId');

    if (!tourId) {
      return NextResponse.json(
        { error: 'tourId is required' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // Fetch all bookings including unavailable
    const { data: allBookings, error: fetchError } = await supabaseServer
      .from('local_tours_bookings')
      .select('*')
      .eq('tour_id', tourId)
      .order('booking_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Also fetch tourbookings to get accurate people counts
    const { data: tourBookings } = await supabaseServer
      .from('tourbooking')
      .select('id, tour_datetime, invitees')
      .eq('tour_id', tourId)
      .eq('status', 'payment_completed');

    // Calculate people count by date
    // Use tourbooking invitees as source of truth (most accurate)
    // Then add pending_payment_people from local_tours_bookings
    const peopleCountByDate = new Map<string, number>();
    
    // First, get counts from tourbooking invitees (source of truth)
    if (tourBookings) {
      tourBookings.forEach((tb: any) => {
        const tourDatetime = tb.tour_datetime;
        if (tourDatetime && typeof tourDatetime === 'string') {
          const dateMatch = tourDatetime.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            const invitees = Array.isArray(tb.invitees) ? tb.invitees : [];
            const totalPeople = invitees.reduce((sum: number, invitee: any) => {
              return sum + (invitee.numberOfPeople || 0);
            }, 0);
            // Use tourbooking count as base (this is the accurate count)
            peopleCountByDate.set(dateStr, totalPeople);
          }
        }
      });
    }
    
    // Then add pending_payment_people from local_tours_bookings (people added but not paid yet)
    (allBookings || []).forEach((booking: any) => {
      const dateStr = booking.booking_date;
      const pendingPeople = booking.pending_payment_people ? Number(booking.pending_payment_people) : 0;
      if (pendingPeople > 0) {
        const currentCount = peopleCountByDate.get(dateStr) || 0;
        peopleCountByDate.set(dateStr, currentCount + pendingPeople);
      }
    });

    // Format bookings for response - match LocalTourBooking type
    const formattedBookings = (allBookings || []).map((booking: any) => ({
      id: booking.id,
      tour_id: booking.tour_id,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time || '14:00:00',
      is_booked: booking.is_booked !== undefined ? booking.is_booked : false,
      user_id: booking.user_id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      stripe_session_id: booking.stripe_session_id,
      booking_id: booking.booking_id,
      status: booking.status || 'available',
      number_of_people: peopleCountByDate.get(booking.booking_date) || 0,
      amnt_of_people: booking.amnt_of_people ? Number(booking.amnt_of_people) : 0,
      pending_payment_people: booking.pending_payment_people ? Number(booking.pending_payment_people) : 0,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    }));

    return NextResponse.json(formattedBookings);
  } catch (error) {
    console.error('Error in admin bookings fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

