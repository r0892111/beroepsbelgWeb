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

  console.log(`[aftercare] Cron triggered at ${new Date().toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    console.log("[aftercare] Fetching bookings where tour date has passed & status = geaccepteerd");

    // Fetch bookings needing after-tour action
    const { data: bookings, error } = await supabase
      .from("tourbooking")
      .select("*")
      .eq("status", "accepted")
      .lt("tour_datetime", now); // tour date already passed

    if (error) {
      console.error("[aftercare] DB error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`[aftercare] Found ${bookings.length} bookings`);

    const webhookUrl = "https://alexfinit.app.n8n.cloud/webhook/efd633d1-a83c-4e58-a537-8ca171eacf70";
    

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
