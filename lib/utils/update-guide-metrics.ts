import { createClient } from '@supabase/supabase-js';

/**
 * Updates guide metrics in guides_temp table based on booking data
 * This function recalculates metrics from all bookings for a specific guide
 */
export async function updateGuideMetrics(guideId: number | null): Promise<void> {
  if (!guideId) {
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[updateGuideMetrics] Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Fetch all bookings for this guide
    const { data: bookings, error: bookingsError } = await supabase
      .from('tourbooking')
      .select('picturesUploaded, pictureCount, isCustomerDetailsRequested')
      .eq('guide_id', guideId);

    if (bookingsError) {
      console.error(`[updateGuideMetrics] Error fetching bookings for guide ${guideId}:`, bookingsError);
      return;
    }

    // Calculate metrics from bookings
    let tours_done = 0;
    let photos_taken_frequency = 0;
    let photos_taken_amount = 0;
    let requested_client_info = 0;

    bookings?.forEach(booking => {
      // Count tours done (any booking with this guide_id)
      tours_done += 1;

      // Count photos taken (when picturesUploaded is true)
      if (booking.picturesUploaded === true) {
        photos_taken_frequency += 1;
        // Add picture count if available
        if (booking.pictureCount && typeof booking.pictureCount === 'number') {
          photos_taken_amount += booking.pictureCount;
        }
      }

      // Count client info requests
      if (booking.isCustomerDetailsRequested === true) {
        requested_client_info += 1;
      }
    });

    // Update guide metrics in guides_temp table
    const { error: updateError } = await supabase
      .from('guides_temp')
      .update({
        tours_done: tours_done,
        photos_taken_frequency: photos_taken_frequency,
        photos_taken_amount: photos_taken_amount,
        requested_client_info: requested_client_info,
      })
      .eq('id', guideId);

    if (updateError) {
      console.error(`[updateGuideMetrics] Error updating guide ${guideId}:`, updateError);
    } else {
      console.log(`[updateGuideMetrics] Successfully updated metrics for guide ${guideId}:`, {
        tours_done,
        photos_taken_frequency,
        photos_taken_amount,
        requested_client_info,
      });
    }
  } catch (error) {
    console.error(`[updateGuideMetrics] Unexpected error updating guide ${guideId}:`, error);
  }
}

/**
 * Updates denied_assignment count for a guide when they decline an assignment
 */
export async function incrementGuideDeniedAssignment(guideId: number | null): Promise<void> {
  if (!guideId) {
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[incrementGuideDeniedAssignment] Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Get current denied_assignment count
    const { data: guide, error: fetchError } = await supabase
      .from('guides_temp')
      .select('denied_assignment')
      .eq('id', guideId)
      .single();

    if (fetchError || !guide) {
      console.error(`[incrementGuideDeniedAssignment] Error fetching guide ${guideId}:`, fetchError);
      return;
    }

    const currentCount = (guide.denied_assignment ?? 0) as number;
    const newCount = currentCount + 1;

    // Increment denied_assignment
    const { error: updateError } = await supabase
      .from('guides_temp')
      .update({ denied_assignment: newCount })
      .eq('id', guideId);

    if (updateError) {
      console.error(`[incrementGuideDeniedAssignment] Error updating guide ${guideId}:`, updateError);
    } else {
      console.log(`[incrementGuideDeniedAssignment] Successfully incremented denied_assignment for guide ${guideId} to ${newCount}`);
    }
  } catch (error) {
    console.error(`[incrementGuideDeniedAssignment] Unexpected error updating guide ${guideId}:`, error);
  }
}

// Export types if needed
export type {};

