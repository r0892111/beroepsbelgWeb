import { NextRequest, NextResponse } from 'next/server';
import { parseBrusselsDateTime, toBrusselsISO } from '@/lib/utils/timezone';

const AVAILABILITY_WEBHOOK_URL = 'https://alexfinit.app.n8n.cloud/webhook/a4fb9e85-ebd0-4ea5-a8a9-18a411018f33';

export async function POST(request: NextRequest) {
  console.log('[check-tanguy-availability] POST request received');
  try {
    const { date, time, durationMinutes = 120 } = await request.json();
    console.log('[check-tanguy-availability] Request params:', { date, time, durationMinutes });

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Parse date and time - they are in Europe/Brussels local time
    // The date string is in format 'yyyy-MM-dd' and time is in format 'HH:mm'
    // Use centralized timezone utility for proper DST handling
    const bookingDate = parseBrusselsDateTime(date, time);

    // Calculate end time (start + duration)
    const endDate = new Date(bookingDate.getTime() + durationMinutes * 60 * 1000);

    // Format dates as UTC+1 (Europe/Brussels) ISO strings
    const startDateTimeUTC1 = toBrusselsISO(bookingDate);
    const endDateTimeUTC1 = toBrusselsISO(endDate);

    console.log('[check-tanguy-availability] Checking availability:', {
      startDateTimeUTC1,
      endDateTimeUTC1,
    });

    // POST to webhook with UTC+1 formatted datetimes
    const webhookResponse = await fetch(AVAILABILITY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDateTime: startDateTimeUTC1,
        endDateTime: endDateTimeUTC1,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('[check-tanguy-availability] Webhook error:', webhookResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to check availability', details: errorText },
        { status: 500 }
      );
    }

    // Webhook returns JSON with available property (may be string or boolean)
    const webhookData = await webhookResponse.json();

    // Normalize the available field to boolean for frontend compatibility
    const available = typeof webhookData.available === 'boolean' 
      ? webhookData.available 
      : webhookData.available === true || webhookData.available === 'true' || webhookData.available === 'True';

    // Return normalized response
    return NextResponse.json({
      available,
    });

  } catch (error: any) {
    console.error('[check-tanguy-availability] Error:', error?.message || error);
    console.error('[check-tanguy-availability] Stack:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

