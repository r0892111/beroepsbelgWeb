import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client directly in this file
function getSupabaseServer() {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be used server-side');
  }

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

interface CompleteTourPageProps {
  params: Promise<{ locale: string; tourId: string }>;
}

async function getTourBookingById(bookingId: string) {
  console.log('[Complete Tour] Looking up booking:', { bookingId });
  
  // tourbooking.id is serial (integer), so parse it
  const bookingIdNum = parseInt(bookingId, 10);
  
  if (isNaN(bookingIdNum)) {
    console.error('[Complete Tour] Invalid booking ID format - must be a number:', bookingId);
    return null;
  }
  
  console.log('[Complete Tour] Parsed booking ID:', bookingIdNum);

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('tourbooking')
    .select('id, tour_id, city, tour_datetime, status')
    .eq('id', bookingIdNum)
    .single();

  console.log('[Complete Tour] Query result:', { 
    hasData: !!data, 
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : null,
    bookingId: data?.id,
    tourId: data?.tour_id,
    city: data?.city
  });

  if (error) {
    console.error('[Complete Tour] Database error:', error);
    // Check if it's a "not found" error (PGRST116)
    if (error.code === 'PGRST116') {
      console.error('[Complete Tour] Booking not found in database');
    }
    return null;
  }

  if (!data) {
    console.error('[Complete Tour] No booking data returned for ID:', bookingIdNum);
    return null;
  }

  // Also fetch the tour details if tour_id exists
  let tour = null;
  if (data.tour_id) {
    const supabase = getSupabaseServer();
    const { data: tourData, error: tourError } = await supabase
      .from('tours_table_prod')
      .select('id, title')
      .eq('id', data.tour_id)
      .single();
    
    if (tourError) {
      console.error('[Complete Tour] Error fetching tour:', tourError);
    } else {
      tour = tourData;
    }
  }

  return {
    ...data,
    tour,
  };
}

async function triggerWebhook(bookingId: string) {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf11', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error triggering webhook:', error);
    return false;
  }
}

export default async function CompleteTourPage({ params }: CompleteTourPageProps) {
  const { locale, tourId } = await params;
  
  // Fetch tourbooking data
  const booking = await getTourBookingById(tourId);

  if (!booking) {
    notFound();
  }

  // Trigger webhook with booking ID
  const webhookSuccess = await triggerWebhook(tourId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {webhookSuccess ? (
          <>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Tour Completed Successfully
            </h1>
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-600">Booking ID:</p>
              <p className="text-lg font-semibold text-gray-900">#{booking.id}</p>
              {booking.tour?.title && (
                <p className="mt-2 text-sm font-medium text-gray-600">Tour:</p>
              )}
              {booking.tour?.title && (
                <p className="text-base font-semibold text-gray-900">{booking.tour.title}</p>
              )}
              {booking.city && (
                <p className="mt-2 text-sm text-gray-500">City: {booking.city}</p>
              )}
              {booking.tour_datetime && (
                <p className="mt-1 text-sm text-gray-500">
                  Date: {new Date(booking.tour_datetime).toLocaleDateString()}
                </p>
              )}
            </div>
            <p className="text-center text-gray-600">
              The guide has successfully completed this tour. The completion has been recorded.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <svg
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Tour Found
            </h1>
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-600">Booking ID:</p>
              <p className="text-lg font-semibold text-gray-900">#{booking.id}</p>
              {booking.tour?.title && (
                <p className="mt-2 text-sm font-medium text-gray-600">Tour:</p>
              )}
              {booking.tour?.title && (
                <p className="text-base font-semibold text-gray-900">{booking.tour.title}</p>
              )}
              {booking.city && (
                <p className="mt-2 text-sm text-gray-500">City: {booking.city}</p>
              )}
              {booking.tour_datetime && (
                <p className="mt-1 text-sm text-gray-500">
                  Date: {new Date(booking.tour_datetime).toLocaleDateString()}
                </p>
              )}
            </div>
            <p className="text-center text-yellow-600">
              The tour was found, but there was an issue recording the completion. Please try again or contact support.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

