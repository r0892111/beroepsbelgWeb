import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { nowBrussels } from '../_shared/timezone.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const nowBrusselsISO = nowBrussels();
  console.log(`[aftercare-check] Cron triggered at ${nowBrusselsISO} (Brussels time)`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { persistSession: false } }
    );

    console.log(
      "[aftercare-check] Fetching bookings with status=aftercare_ready and tour_end < now (Brussels time)"
    );

    // Convert Brussels time to UTC for database comparison (tour_datetime is stored as UTC)
    const nowUTC = new Date(nowBrusselsISO).toISOString();

    // ✅ SINGLE SOURCE OF TRUTH — DB does the filtering
    const { data: bookings, error } = await supabase
      .from("tourbooking")
      .select("*")
      .eq("status", "aftercare_ready")
      .eq("is_aftercare_started", false)
      .lt("tour_datetime", nowUTC);

    if (error) {
      console.error("[aftercare-check] Database error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(
      `[aftercare-check] Found ${bookings?.length ?? 0} bookings ready for aftercare`
    );

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No bookings ready for aftercare",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl =
      "https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf70";

    let processedCount = 0;

    for (const booking of bookings) {
      console.log(
        `[aftercare-check] Sending booking ${booking.id} to aftercare webhook`
      );

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking),
        });

        if (!res.ok) {
          console.error(
            `[aftercare-check] Webhook failed for booking ${booking.id}`,
            res.status,
            res.statusText
          );
          continue;
        }

        // ✅ Mark aftercare as started ONLY after successful webhook
        const { error: updateError } = await supabase
          .from("tourbooking")
          .update({ is_aftercare_started: true })
          .eq("id", booking.id);

        if (updateError) {
          console.error(
            `[aftercare-check] Failed to update booking ${booking.id}`,
            updateError
          );
        } else {
          processedCount++;
          console.log(
            `[aftercare-check] Booking ${booking.id} marked as aftercare_started`
          );
        }
      } catch (err) {
        console.error(
          `[aftercare-check] Webhook error for booking ${booking.id}`,
          err
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEligible: bookings.length,
        aftercareProcessed: processedCount,
        skipped: bookings.length - processedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[aftercare-check] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
