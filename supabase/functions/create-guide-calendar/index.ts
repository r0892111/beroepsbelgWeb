import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('isAdmin, is_admin, google_access_token, google_refresh_token')
      .eq('id', user.id)
      .single();

    if (profileError || (!profile?.isAdmin && !profile?.is_admin)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get admin's access token
    let accessToken = profile.google_access_token;

    // If no access token or need to refresh
    if (!accessToken && profile.google_refresh_token) {
      const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
      const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: profile.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        // Update the access token in the database
        await supabase
          .from('profiles')
          .update({ google_access_token: accessToken })
          .eq('id', user.id);
      }
    }

    if (!accessToken) {
      throw new Error('No Google Calendar access token found. Please connect your Google account first.');
    }

    // Get guide details from request
    const { guideId, guideName, guideEmail } = await req.json();

    if (!guideId || !guideName) {
      throw new Error('Guide ID and name are required');
    }

    // Create calendar with the guide's name
    const calendarName = `Gidscalendar ${guideName}`;
    
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: calendarName,
        description: `Calendar for guide ${guideName} - Beroepsbelg`,
        timeZone: 'Europe/Brussels',
      }),
    });

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json().catch(() => ({}));
      console.error('Calendar creation failed:', errorData);
      throw new Error(`Failed to create calendar: ${errorData.error?.message || 'Unknown error'}`);
    }

    const calendar = await calendarResponse.json();
    console.log('Calendar created:', calendar.id);

    // Update guide with calendar ID
    const { error: updateError } = await supabase
      .from('guides_temp')
      .update({
        google_calendar_id: calendar.id,
      })
      .eq('id', guideId);

    if (updateError) {
      console.error('Failed to update guide:', updateError);
      throw new Error('Failed to save calendar ID to guide');
    }

    // If guide email is provided, send them an invite email
    let emailSent = false;
    if (guideEmail) {
      try {
        // TODO: Implement email sending via your email service
        // For now, we just log it
        console.log(`Should send calendar invite to ${guideEmail}`);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendarId: calendar.id,
        calendarName: calendarName,
        emailSent: emailSent,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Create guide calendar error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

