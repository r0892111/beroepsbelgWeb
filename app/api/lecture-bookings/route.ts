import { NextRequest, NextResponse } from 'next/server';
import { createLectureBooking } from '@/lib/api/content';
import type { LectureBooking } from '@/lib/data/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || (!body.phone && !body.email)) {
      return NextResponse.json(
        { error: 'Name and at least one contact method (phone or email) are required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create booking
    const bookingData: Omit<LectureBooking, 'id' | 'created_at' | 'updated_at' | 'status'> & { lecture_language?: string } = {
      lecture_id: body.lecture_id || undefined,
      name: body.name.trim(),
      phone: body.phone?.trim() || undefined,
      email: body.email?.trim() || undefined,
      preferred_date: body.preferred_date || undefined,
      number_of_people: body.number_of_people ? Number(body.number_of_people) : undefined,
      location_description: body.location_description?.trim() || undefined,
      needs_room_provided: body.needs_room_provided || false,
      lecture_language: body.lecture_language || undefined,
    };

    const booking = await createLectureBooking(bookingData);

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

