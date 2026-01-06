import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Calendar ID from public embed URL
// Public URL: https://calendar.google.com/calendar/embed?src=c_a1f78a143e1fcf899820d47da1ab128bd7a1f291f9dc572b7a33fb761e45b8d8%40group.calendar.google.com&ctz=Europe%2FBrussels
// URL-decoded calendar ID:
const TANGUY_CALENDAR_ID = 'c_a1f78a143e1fcf899820d47da1ab128bd7a1f291f9dc572b7a33fb761e45b8d8@group.calendar.google.com';

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
    return null;
  }

  // If we have a valid access token, use it
  if (adminProfile.google_access_token) {
    return adminProfile.google_access_token;
  }

  // If we have a refresh token, refresh it
  if (adminProfile.google_refresh_token) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return null;
    }

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
  try {
    const { date, time, durationMinutes = 120 } = await request.json();

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Parse date and time - they are in Europe/Brussels local time
    // The date string is in format 'yyyy-MM-dd' and time is in format 'HH:mm'
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Determine if we're in daylight saving time
    // DST in Europe: last Sunday in March to last Sunday in October
    const monthNum = parseInt(date.split('-')[1]);
    const isDST = monthNum >= 4 && monthNum <= 9; // April-September are definitely DST
    const brusselsOffsetHours = isDST ? 2 : 1; // UTC+2 in summer, UTC+1 in winter
    
    // Create date with explicit Brussels timezone offset
    // This creates a date object representing the Brussels local time
    // Example: "2025-12-31T14:00:00+01:00" means 14:00 Brussels time
    const dateTimeString = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${brusselsOffsetHours === 2 ? '+02:00' : '+01:00'}`;
    let bookingDate = new Date(dateTimeString);
    
    // Verify the date was parsed correctly
    if (isNaN(bookingDate.getTime())) {
      // Fallback: manually calculate UTC time
      // 14:00 Brussels (UTC+1) = 13:00 UTC, 14:00 Brussels (UTC+2) = 12:00 UTC
      const utcHours = hours - brusselsOffsetHours;
      bookingDate = new Date(Date.UTC(year, month - 1, day, utcHours, minutes, 0));
    }

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
      return NextResponse.json(
        { error: 'Failed to check calendar availability' },
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
      return NextResponse.json(
        { error: 'Calendar access error' },
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

