import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

interface CompleteTourPageProps {
  params: Promise<{ locale: string; tourId: string }>;
}

async function getTourById(tourId: string) {
  const { data, error } = await supabaseServer
    .from('tours_table_prod')
    .select('id, title, city')
    .eq('id', tourId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function triggerWebhook(tourId: string) {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf11', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tour_id: tourId }),
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
  
  // Fetch tour data
  const tour = await getTourById(tourId);

  if (!tour) {
    notFound();
  }

  // Trigger webhook
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
              <p className="text-sm font-medium text-gray-600">Tour:</p>
              <p className="text-lg font-semibold text-gray-900">{tour.title}</p>
              {tour.city && (
                <p className="mt-1 text-sm text-gray-500">City: {tour.city}</p>
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
              <p className="text-sm font-medium text-gray-600">Tour:</p>
              <p className="text-lg font-semibold text-gray-900">{tour.title}</p>
              {tour.city && (
                <p className="mt-1 text-sm text-gray-500">City: {tour.city}</p>
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

