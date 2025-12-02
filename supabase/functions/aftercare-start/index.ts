import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  console.log(`[aftercare-start] Cron job triggered at ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[aftercare-start] Supabase client initialized');

    // Calculate date range: tours that happened yesterday (for day-after follow-up)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    console.log('[aftercare-start] Looking for completed tours between:', {
      start: yesterday.toISOString(),
      end: yesterdayEnd.toISOString(),
    });

    // Fetch all completed bookings from yesterday that haven't had aftercare yet
    const { data: bookings, error: bookingsError } = await supabase
      .from('tourbooking')
      .select('*')
      .eq('status', 'completed')
      .gte('tour_datetime', yesterday.toISOString())
      .lte('tour_datetime', yesterdayEnd.toISOString())
      .is('aftercare_sent_at', null);

    if (bookingsError) {
      console.error('[aftercare-start] Error fetching bookings:', bookingsError);
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    console.log(`[aftercare-start] Found ${bookings?.length || 0} bookings needing aftercare`);

    if (!bookings || bookings.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[aftercare-start] No bookings to process. Completed in ${duration}ms`);
      
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No bookings needing aftercare',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Process each booking
    for (const booking of bookings) {
      console.log(`[aftercare-start] Processing booking: ${booking.id}`);
      
      const invitee = booking.invitees?.[0];
      if (!invitee) {
        console.warn(`[aftercare-start] No invitee for booking ${booking.id}, skipping`);
        continue;
      }

      console.log('[aftercare-start] Invitee:', {
        name: invitee.name,
        email: invitee.email,
        numberOfPeople: invitee.numberOfPeople,
      });

      // TODO: Add your aftercare logic here
      // Examples:
      // - Send follow-up email via Resend/SendGrid
      // - Request review via email
      // - Trigger n8n webhook
      // - Send to CRM

      // Mark booking as aftercare sent
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ aftercare_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error(`[aftercare-start] Error updating booking ${booking.id}:`, updateError);
      } else {
        console.log(`[aftercare-start] Marked booking ${booking.id} as aftercare sent`);
      }

      results.push({
        bookingId: booking.id,
        customerEmail: invitee.email,
        customerName: invitee.name,
        city: booking.city,
        tourDate: booking.tour_datetime,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[aftercare-start] Completed processing ${results.length} bookings in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        bookings: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[aftercare-start] Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

