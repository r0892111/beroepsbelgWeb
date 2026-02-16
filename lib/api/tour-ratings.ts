import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

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

/**
 * Calculate average tour rating and review count from guide feedback submissions
 * Ratings are stored in guides_temp.form_submissions array
 * We need to find all guides who have done this tour, then aggregate their tour_ratings
 */
export async function getTourRatings(tourId: string): Promise<{ ratingValue: number; reviewCount: number } | null> {
  try {
    // First, find all bookings for this tour to get guide IDs
    // Check both guide_id (single) and guide_ids (array) fields
    const { data: bookings, error: bookingsError } = await supabase
      .from('tourbooking')
      .select('guide_id, guide_ids')
      .eq('tour_id', tourId);

    if (bookingsError || !bookings || bookings.length === 0) {
      return null;
    }

    // Collect all unique guide IDs from both guide_id and guide_ids fields
    const guideIdsSet = new Set<number>();
    bookings.forEach((booking) => {
      if (booking.guide_id) {
        guideIdsSet.add(booking.guide_id);
      }
      if (booking.guide_ids && Array.isArray(booking.guide_ids)) {
        booking.guide_ids.forEach((id: number) => {
          if (id) guideIdsSet.add(id);
        });
      }
    });

    const guideIds = Array.from(guideIdsSet);
    if (guideIds.length === 0) {
      return null;
    }

    // Fetch all guides with their form_submissions
    const { data: guides, error: guidesError } = await supabase
      .from('guides_temp')
      .select('form_submissions')
      .in('id', guideIds);

    if (guidesError || !guides) {
      return null;
    }

    // Aggregate all tour_ratings from all submissions
    const allRatings: number[] = [];

    guides.forEach((guide) => {
      const submissions = guide.form_submissions as FeedbackSubmission[] | null;
      if (submissions && Array.isArray(submissions)) {
        submissions.forEach((submission) => {
          if (submission.tour_rating && typeof submission.tour_rating === 'number') {
            allRatings.push(submission.tour_rating);
          }
        });
      }
    });

    if (allRatings.length === 0) {
      return null;
    }

    // Calculate average rating
    const sum = allRatings.reduce((acc, rating) => acc + rating, 0);
    const averageRating = sum / allRatings.length;

    return {
      ratingValue: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount: allRatings.length,
    };
  } catch {
    return null;
  }
}
