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

    // Check if any bookings exist for this date
    const { data: existingBookings, error: fetchError } = await supabaseServer
      .from('local_tours_bookings')
      .select('id')
      .eq('tour_id', tourId)
      .eq('booking_date', bookingDate);

    if (fetchError) {
      console.error('Error fetching existing bookings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing bookings' },
        { status: 500 }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      // Update ALL existing bookings for this date (there can be multiple customer bookings)
      const { error: updateError } = await supabaseServer
        .from('local_tours_bookings')
        .update({ status })
        .eq('tour_id', tourId)
        .eq('booking_date', bookingDate);

      if (updateError) {
        console.error('Error updating bookings:', updateError);
        return NextResponse.json(
          { error: 'Failed to update booking status' },
          { status: 500 }
        );
      }
    } else {
      // Create new booking entry with unavailable status (for dates with no bookings yet)
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

    // If marking as unavailable, also cancel related tourbooking entries for this date
    if (status === 'unavailable') {
      // Find all tourbookings for this tour and date
      const { data: relatedTourBookings, error: tourBookingsError } = await supabaseServer
        .from('tourbooking')
        .select('id, tour_datetime, status')
        .eq('tour_id', tourId);

      if (!tourBookingsError && relatedTourBookings) {
        // Filter tourbookings that match the booking date
        const dateStr = bookingDate; // YYYY-MM-DD format
        const matchingTourBookings = relatedTourBookings.filter((tb: any) => {
          if (!tb.tour_datetime) return false;
          const dateMatch = tb.tour_datetime.match(/^(\d{4}-\d{2}-\d{2})/);
          return dateMatch && dateMatch[1] === dateStr;
        });

        // Update matching tourbookings to cancelled (only if not already completed or cancelled)
        if (matchingTourBookings.length > 0) {
          const bookingIds = matchingTourBookings
            .filter((tb: any) => tb.status !== 'completed' && tb.status !== 'cancelled')
            .map((tb: any) => tb.id);

          if (bookingIds.length > 0) {
            const { error: cancelError } = await supabaseServer
              .from('tourbooking')
              .update({ status: 'cancelled' })
              .in('id', bookingIds);

            if (cancelError) {
              console.error('Error cancelling related tourbookings:', cancelError);
              // Don't fail the request, just log the error
            }
          }
        }
      }
    }

    // Return updated bookings list - fetch directly from database to include unavailable dates
    // (getLocalToursBookings filters out unavailable dates, but admin needs to see them)
    const { data: allBookings, error: allBookingsError } = await supabaseServer
      .from('local_tours_bookings')
      .select('*')
      .eq('tour_id', tourId)
      .order('booking_date', { ascending: true });

    if (allBookingsError) {
      console.error('Error fetching bookings:', allBookingsError);
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

    return NextResponse.json({ success: true, bookings: formattedBookings });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

