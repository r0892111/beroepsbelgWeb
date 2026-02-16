import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nowBrussels } from '@/lib/utils/timezone';

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FeedbackSubmission {
  guide_rating: number;
  guide_feedback: string | null;
  tour_rating: number;
  tour_feedback: string | null;
  booking_rating: number;
  found_us_source: string;
  email: string | null;
  submitted_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guideId, guideRating, guideFeedback, tourRating, tourFeedback, bookingRating, foundUsSource, email, locale } = body;

    // Validate required fields
    if (!guideId || typeof guideId !== 'number') {
      return NextResponse.json({ error: 'Valid guideId is required' }, { status: 400 });
    }

    if (!guideRating || guideRating < 1 || guideRating > 5) {
      return NextResponse.json({ error: 'Guide rating must be between 1 and 5' }, { status: 400 });
    }

    if (!tourRating || tourRating < 1 || tourRating > 5) {
      return NextResponse.json({ error: 'Tour rating must be between 1 and 5' }, { status: 400 });
    }

    if (!bookingRating || bookingRating < 1 || bookingRating > 5) {
      return NextResponse.json({ error: 'Booking rating must be between 1 and 5' }, { status: 400 });
    }

    if (!foundUsSource || typeof foundUsSource !== 'string') {
      return NextResponse.json({ error: 'Source is required' }, { status: 400 });
    }

    // Create the new submission
    const newSubmission: FeedbackSubmission = {
      guide_rating: guideRating,
      guide_feedback: guideFeedback || null,
      tour_rating: tourRating,
      tour_feedback: tourFeedback || null,
      booking_rating: bookingRating,
      found_us_source: foundUsSource,
      email: email || null,
      submitted_at: nowBrussels(),
    };

    // Fetch current guide to get existing submissions
    const { data: guide, error: fetchError } = await supabase
      .from('guides_temp')
      .select('form_submissions')
      .eq('id', guideId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    // Get existing submissions or start with empty array
    const existingSubmissions = (guide?.form_submissions as FeedbackSubmission[]) || [];
    const updatedSubmissions = [...existingSubmissions, newSubmission];

    // Update the guide with new submissions array
    const { error: updateError } = await supabase
      .from('guides_temp')
      .update({ form_submissions: updatedSubmissions })
      .eq('id', guideId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    // Fetch guide name for webhook
    const { data: guideData } = await supabase
      .from('guides_temp')
      .select('name')
      .eq('id', guideId)
      .single();

    // Send to n8n webhook
    try {
      await fetch('https://alexfinit.app.n8n.cloud/webhook/91449ba3-0b23-454b-a59f-f3bcf7599faf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guide_id: guideId,
          guide_name: guideData?.name || null,
          guide_rating: guideRating,
          guide_feedback: guideFeedback || null,
          tour_rating: tourRating,
          tour_feedback: tourFeedback || null,
          booking_rating: bookingRating,
          found_us_source: foundUsSource,
          email: email || null,
          submitted_at: newSubmission.submitted_at,
          locale: locale || 'nl',
        }),
      });
    } catch {
      // Webhook error - don't fail the request
    }

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
