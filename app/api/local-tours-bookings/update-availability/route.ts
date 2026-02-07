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

    // Return updated bookings list - fetch directly from database to include unavailable dates
    // (getLocalToursBookings filters out unavailable dates, but admin needs to see them)
    const { data: allBookings, error: fetchError } = await supabaseServer
      .from('local_tours_bookings')
      .select('*')
      .eq('tour_id', tourId)
      .order('booking_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      // Fallback to getLocalToursBookings if direct fetch fails
      const bookings = await getLocalToursBookings(tourId);
      return NextResponse.json({ success: true, bookings });
    }

    // Also fetch tourbookings to get accurate people counts
    const { data: tourBookings } = await supabaseServer
      .from('tourbooking')
      .select('id, tour_datetime, invitees')
      .eq('tour_id', tourId)
      .eq('status', 'payment_completed');

    // Calculate people count by date
    const peopleCountByDate = new Map<string, number>();
    (allBookings || []).forEach((booking: any) => {
      const dateStr = booking.booking_date;
      const amntOfPeople = booking.amnt_of_people || 0;
      const currentCount = peopleCountByDate.get(dateStr) || 0;
      peopleCountByDate.set(dateStr, currentCount + amntOfPeople);
    });

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
            const currentCount = peopleCountByDate.get(dateStr) || 0;
            if (totalPeople > currentCount) {
              peopleCountByDate.set(dateStr, totalPeople);
            }
          }
        }
      });
    }

    // Format bookings for response
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
      amnt_of_people: booking.amnt_of_people || 0,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    }));

    return NextResponse.json({ success: true, bookings: formattedBookings });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

