import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBrusselsDateTime } from '@/lib/utils/timezone';

// Calendar ID from public embed URL
// Public URL: https://calendar.google.com/calendar/embed?src=c_4ab8e279307c0e7083f815bff63cb65ce14df69f37ba5f9f4e5e8620a5b612d2%40group.calendar.google.com&ctz=Europe%2FBrussels
// URL-decoded calendar ID:
const TANGUY_CALENDAR_ID = '61012c8e81e4701051cbb7a6a7f510cd510a4d6fb81b6e92cec055c261c93977@group.calendar.google.com';


function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function getGoogleAccessToken(): Promise<string | null> {
  console.log('[getGoogleAccessToken] Starting...');
  const supabase = getSupabaseServer();

  // Get admin profile with Google tokens
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token')
    .or('isAdmin.eq.true')
    .not('google_refresh_token', 'is', null)
    .limit(1)
    .single();

  if (profileError || !adminProfile) {
    console.error('[getGoogleAccessToken] Failed to get admin profile:', profileError?.message || 'No admin found with Google tokens');
    return null;
  }
  console.log('[getGoogleAccessToken] Found admin profile:', adminProfile.id);

  // If we have a valid access token, use it
  if (adminProfile.google_access_token) {
    return adminProfile.google_access_token;
  }

  // If we have a refresh token, refresh it
  if (adminProfile.google_refresh_token) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[getGoogleAccessToken] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return null;
    }
    console.log('[getGoogleAccessToken] Refreshing token...');

    try {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: adminProfile.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Failed to refresh Google token:', refreshResponse.status, errorText);
        return null;
      }

      const tokens = await refreshResponse.json();
      
      // Update the access token in the database
      await supabase
        .from('profiles')
        .update({ google_access_token: tokens.access_token })
        .eq('id', adminProfile.id);

      return tokens.access_token;
    } catch (error) {
      return null;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  console.log('[check-tanguy-availability] POST request received');
  try {
    const { date, time, durationMinutes = 120 } = await request.json();
    console.log('[check-tanguy-availability] Request params:', { date, time, durationMinutes });

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Parse date and time - they are in Europe/Brussels local time
    // The date string is in format 'yyyy-MM-dd' and time is in format 'HH:mm'
    // Use centralized timezone utility for proper DST handling
    const bookingDate = parseBrusselsDateTime(date, time);

    // Calculate end time (start + duration)
    const endDate = new Date(bookingDate.getTime() + durationMinutes * 60 * 1000);

    // Format dates for Google Calendar API (RFC3339)
    // The freeBusy API expects UTC times in RFC3339 format
    // When we convert a Brussels time to UTC, JavaScript correctly handles the conversion
    // So 14:00 Brussels (UTC+1) becomes 13:00 UTC, which is correct
    // Google Calendar will then check if Tanguy is busy at 14:00-16:00 Brussels time
    const timeMin = bookingDate.toISOString();
    const timeMax = endDate.toISOString();
    

    // Get Google access token
    const accessToken = await getGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Calendar access not configured' },
        { status: 503 }
      );
    }

    // Check availability using freeBusy API
    // The freeBusy API accepts UTC times in RFC3339 format
    // Note: The timeZone parameter is optional and only affects how errors are reported
    // The actual time checking is done in UTC
    const requestBody = {
      timeMin,
      timeMax,
      items: [
        { id: TANGUY_CALENDAR_ID }
      ],
    };
    
    const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!freeBusyResponse.ok) {
      const errorText = await freeBusyResponse.text();
      console.error('FreeBusy API error:', freeBusyResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to check calendar availability', details: errorText },
        { status: 500 }
      );
    }

    const freeBusyData = await freeBusyResponse.json();
    
    // Get calendar data - try multiple formats of the calendar ID
    // Google Calendar API might return the calendar ID in different formats
    const encodedCalendarId = encodeURIComponent(TANGUY_CALENDAR_ID);
    const calendarData = freeBusyData.calendars?.[TANGUY_CALENDAR_ID] || 
                         freeBusyData.calendars?.[encodedCalendarId] ||
                         freeBusyData.calendars?.[TANGUY_CALENDAR_ID.replace('@', '%40')] ||
                         Object.values(freeBusyData.calendars || {})[0]; // Fallback to first calendar if ID doesn't match

    if (!calendarData) {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }
    
    // Check for errors in the calendar data
    if (calendarData.errors && calendarData.errors.length > 0) {
      console.error('Calendar access errors:', JSON.stringify(calendarData.errors, null, 2));
      console.error('Full freeBusy response:', JSON.stringify(freeBusyData, null, 2));
      return NextResponse.json(
        { 
          error: 'Calendar access error',
          details: calendarData.errors[0]?.reason || 'Unknown error',
          message: calendarData.errors[0]?.domain === 'calendar' 
            ? 'The calendar may not be accessible. Make sure the calendar is shared with the admin account or is public.' 
            : 'Failed to access the calendar'
        },
        { status: 403 }
      );
    }

    // Check if there are any busy periods
    // The freeBusy API returns busy periods that overlap with the timeMin-timeMax range
    // IMPORTANT: Only events marked as "Busy" (opaque) will appear here
    // Events marked as "Free" (transparent) will NOT appear in the busy array
    const busyPeriods = Array.isArray(calendarData.busy) ? calendarData.busy : [];
    
    // Tanguy is available ONLY if there are NO busy periods
    // If busyPeriods array has any items, Tanguy is busy/not available
    const isAvailable = busyPeriods.length === 0;

    return NextResponse.json({
      available: isAvailable,
      busy: busyPeriods,
      timeMin,
      timeMax,
    });

  } catch (error: any) {
    console.error('[check-tanguy-availability] Error:', error?.message || error);
    console.error('[check-tanguy-availability] Stack:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

