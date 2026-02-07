import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getLocalToursBookings } from '@/lib/api/content';
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
 * POST /api/local-tours-bookings/update-availability
 * Updates the availability status of a date for a local tour
 * Requires admin authentication
 * 
 * Body: {
 *   tourId: string,
 *   bookingDate: string (YYYY-MM-DD),
 *   status: 'available' | 'unavailable'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tourId, bookingDate, status } = body;

    if (!tourId || !bookingDate || !status) {
      return NextResponse.json(
        { error: 'tourId, bookingDate, and status are required' },
        { status: 400 }
      );
    }

    if (!['available', 'unavailable'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "available" or "unavailable"' },
        { status: 400 }
      );
    }

    // Check if a booking already exists for this date
    const { data: existingBooking, error: fetchError } = await supabaseServer
      .from('local_tours_bookings')
      .select('id')
      .eq('tour_id', tourId)
      .eq('booking_date', bookingDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching existing booking:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing booking' },
        { status: 500 }
      );
    }

    if (existingBooking) {
      // Update existing booking
      const { error: updateError } = await supabaseServer
        .from('local_tours_bookings')
        .update({ status })
        .eq('id', existingBooking.id);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        return NextResponse.json(
          { error: 'Failed to update booking status' },
          { status: 500 }
        );
      }
    } else {
      // Create new booking with unavailable status
      const { error: insertError } = await supabaseServer
        .from('local_tours_bookings')
        .insert({
          tour_id: tourId,
          booking_date: bookingDate,
          booking_time: '14:00:00',
          status,
          is_booked: false,
        });

      if (insertError) {
        console.error('Error creating booking:', insertError);
        return NextResponse.json(
          { error: 'Failed to create booking' },
          { status: 500 }
        );
      }
    }

    // Return updated bookings list
    const bookings = await getLocalToursBookings(tourId);
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

