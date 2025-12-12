import { NextRequest, NextResponse } from 'next/server';
import { getParentBooking } from '@/lib/api/content';

/**
 * GET /api/local-tours-bookings/[bookingId]
 * Fetches the parent tourbooking entry for a local tours booking slot
 * 
 * @param bookingId - The booking_id from local_tours_bookings (references tourbooking.id)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const bookingId = parseInt(params.bookingId);

    console.log('Parent booking API called:', {
      bookingId,
      url: request.url,
    });

    if (!bookingId || isNaN(bookingId)) {
      console.error('Parent booking API: Invalid bookingId');
      return NextResponse.json(
        { error: 'Invalid bookingId' },
        { status: 400 }
      );
    }

    const booking = await getParentBooking(bookingId);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    console.log('Parent booking API: Returning booking:', {
      bookingId,
      booking,
    });
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error in parent booking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



