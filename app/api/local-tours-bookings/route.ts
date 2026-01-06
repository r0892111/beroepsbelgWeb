import { NextRequest, NextResponse } from 'next/server';
import { getLocalToursBookings } from '@/lib/api/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get('tourId');

    if (!tourId) {
      return NextResponse.json(
        { error: 'tourId is required' },
        { status: 400 }
      );
    }

    const bookings = await getLocalToursBookings(tourId);
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

