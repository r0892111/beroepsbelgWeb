import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log(`[aftercare-check] Cron triggered at ${new Date().toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("service_api_key")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    console.log("[aftercare-check] Fetching bookings where tour has finished (tour_datetime + duration < now)");

    // Fetch bookings with tour details where the tour has finished
    // We need to join with tours_table_prod to get the duration
    const { data: bookings, error } = await supabase
      .from("tourbooking")
      .select(`
        *,
        tours_table_prod!tourbooking_tour_id_fkey (
          duration_minutes
        )
      `)
      .not("tour_datetime", "is", null); // Only bookings with a tour_datetime

    if (error) {
      console.error("[aftercare-check] DB error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`[aftercare-check] Found ${bookings?.length || 0} bookings with tour_datetime`);

    // Filter bookings where tour_datetime + duration_minutes < now
    const finishedBookings = bookings?.filter((booking: any) => {
      if (!booking.tour_datetime) return false;
      
      const tour = booking.tours_table_prod;
      if (!tour || !tour.duration_minutes) {
        console.warn(`[aftercare-check] Booking ${booking.id} has no duration_minutes, skipping`);
        return false;
      }

      const tourStart = new Date(booking.tour_datetime);
      const tourEnd = new Date(tourStart.getTime() + tour.duration_minutes * 60 * 1000);
      const nowDate = new Date(now);

      const hasFinished = tourEnd < nowDate;
      
      if (hasFinished) {
        console.log(`[aftercare-check] Booking ${booking.id} tour finished:`, {
          tourStart: tourStart.toISOString(),
          durationMinutes: tour.duration_minutes,
          tourEnd: tourEnd.toISOString(),
          now: nowDate.toISOString(),
        });
      }

      return hasFinished;
    }) || [];

    console.log(`[aftercare-check] Found ${finishedBookings.length} bookings where tour has finished`);

    const webhookUrl = "https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf70";

    let processedCount = 0;

    for (const booking of finishedBookings) {
      // Only process bookings that haven't been sent yet
      if (!booking.is_aftercare_started) {
        console.log(`[aftercare-check] Sending booking ${booking.id} to webhook...`);
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking),
          });

          if (!res.ok) {
            console.error(`[aftercare-check] Failed webhook for booking ${booking.id}:`, res.status, res.statusText);
            continue;
          }

          console.log(`[aftercare-check] Webhook sent successfully for booking ${booking.id}`);
          
          // Mark as sent after successful webhook
          const { error: updateError } = await supabase
            .from("tourbooking")
            .update({ is_aftercare_started: true })
            .eq("id", booking.id);

          if (updateError) {
            console.error(`[aftercare-check] Failed to update booking ${booking.id}:`, updateError);
          } else {
            processedCount++;
            console.log(`[aftercare-check] Marked booking ${booking.id} as sent`);
          }
        } catch (err) {
          console.error(`[aftercare-check] Webhook error for booking ${booking.id}:`, err);
        }
      } else {
        console.log(`[aftercare-check] Booking ${booking.id} already processed (is_aftercare_started = true), skipping`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFinished: finishedBookings.length,
        processed: processedCount,
        skipped: finishedBookings.length - processedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[aftercare-check] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

