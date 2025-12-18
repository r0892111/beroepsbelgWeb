import { NextRequest, NextResponse } from 'next/server';
import { getLocalToursBookings } from '@/lib/api/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get('tourId');

    console.log('Local tours bookings API called:', {
      tourId,
      url: request.url,
    });

    if (!tourId) {
      console.error('Local tours bookings API: tourId is required');
      return NextResponse.json(
        { error: 'tourId is required' },
        { status: 400 }
      );
    }

    const bookings = await getLocalToursBookings(tourId);
    console.log('Local tours bookings API: Returning bookings:', {
      tourId,
      bookingsCount: bookings?.length || 0,
      bookings,
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error in local-tours-bookings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

