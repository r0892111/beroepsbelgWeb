import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { nowBrussels, toBrusselsLocalISO } from '../_shared/timezone.ts';

// Helper function to update guide metrics
async function updateGuideMetrics(supabase: any, guideId: number | null): Promise<void> {
  if (!guideId) {
    return;
  }

  try {
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

    bookings?.forEach((booking: any) => {
      tours_done += 1;
      if (booking.picturesUploaded === true) {
        photos_taken_frequency += 1;
        if (booking.pictureCount && typeof booking.pictureCount === 'number') {
          photos_taken_amount += booking.pictureCount;
        }
      }
      if (booking.isCustomerDetailsRequested === true) {
        requested_client_info += 1;
      }
    });

    // Update guide metrics
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
    }
  } catch (error) {
    console.error(`[updateGuideMetrics] Unexpected error updating guide ${guideId}:`, error);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const nowBrusselsISO = nowBrussels();
  console.log(`[aftercare] Cron triggered at ${nowBrusselsISO} (Brussels time)`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Use Brussels local time WITHOUT timezone offset for database comparison (tour_datetime is stored as text without timezone offset)
    const nowBrusselsLocal = toBrusselsLocalISO(new Date(nowBrusselsISO));

    console.log("[aftercare] Fetching bookings where tour date has passed & status = aftercare_ready (Brussels time)");

    // Fetch bookings needing after-tour action
    const { data: bookings, error } = await supabase
      .from("tourbooking")
      .select("*")
      .eq("status", "aftercare_ready")
      .lt("tour_datetime", nowBrusselsLocal); // tour date already passed

    if (error) {
      console.error("[aftercare] DB error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`[aftercare] Found ${bookings.length} bookings`);

    const webhookUrl = "https://alexfinit.app.n8n.cloud/webhook/e1dc029a-1223-4e8d-918a-72bcb072c2ad";
    

    for (const booking of bookings) {
      // Only process bookings that haven't been sent yet
      if (!booking.isCustomerDetailsRequested) {
        console.log(`[aftercare] Sending booking ${booking.id} to webhook...`);
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking),
          });

          if (!res.ok) {
            console.error(`[aftercare] Failed webhook for booking ${booking.id}`);
            continue;
          }

          console.log(`[aftercare] Webhook sent for booking ${booking.id}`);
          
          // Mark as sent after successful webhook
          await supabase.from("tourbooking").update({isCustomerDetailsRequested: true}).eq("id", booking.id);
          
          // Update guide metrics when customer details are requested
          if (booking.guide_id) {
            await updateGuideMetrics(supabase, booking.guide_id);
          }
        } catch (err) {
          console.error(`[aftercare] Webhook error for booking ${booking.id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: bookings.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[aftercare] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
