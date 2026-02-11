import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateGuideMetrics } from '@/lib/utils/update-guide-metrics';

// Extract folder ID from Google Drive URL or return the ID directly
function extractFolderId(googleDriveLink: string | null): string | null {
  if (!googleDriveLink) {
    return null;
  }

  // If it's already just an ID (no URL), return it
  if (!googleDriveLink.includes('/')) {
    return googleDriveLink;
  }

  // Extract folder ID from various Google Drive URL formats
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = googleDriveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If no match, try to extract from the end of the URL
  const parts = googleDriveLink.split('/');
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length > 10) {
    return lastPart;
  }

  return null;
}

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
  
  // Get any admin's Google access token (for uploading tour photos)
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token')
    .or('isAdmin.eq.true,is_admin.eq.true')
    .not('google_refresh_token', 'is', null)
    .limit(1)
    .single();

  if (profileError || !adminProfile) {
    console.error('[getGoogleAccessToken] No admin profile found with Google tokens:', profileError?.message);
    return null;
  }

  // If we have an access token, try to validate it first by making a test request
  if (adminProfile.google_access_token) {
    // Test if the token is still valid by making a lightweight API call
    try {
      const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + adminProfile.google_access_token);
      if (testResponse.ok) {
        return adminProfile.google_access_token;
      }
      // Token is invalid, will try to refresh below
      console.log('[getGoogleAccessToken] Access token expired, refreshing...');
    } catch (error) {
      console.log('[getGoogleAccessToken] Error validating token, refreshing...');
    }
  }

  // If we have a refresh token, refresh it
  if (adminProfile.google_refresh_token) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[getGoogleAccessToken] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
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
        const errorData = await refreshResponse.json().catch(() => ({}));
        console.error('[getGoogleAccessToken] Token refresh failed:', {
          status: refreshResponse.status,
          error: errorData.error || 'unknown',
          error_description: errorData.error_description || 'no description',
        });
        
        // If refresh token is invalid/expired, clear it from database
        if (refreshResponse.status === 400 && (errorData.error === 'invalid_grant' || errorData.error === 'invalid_request')) {
          console.error('[getGoogleAccessToken] Refresh token is invalid, clearing from database');
          await supabase
            .from('profiles')
            .update({ 
              google_access_token: null,
              google_refresh_token: null 
            })
            .eq('id', adminProfile.id);
        }
        
        return null;
      }

      const tokens = await refreshResponse.json();
      
      if (!tokens.access_token) {
        console.error('[getGoogleAccessToken] No access token in refresh response');
        return null;
      }
      
      // Update the access token in the database
      await supabase
        .from('profiles')
        .update({ google_access_token: tokens.access_token })
        .eq('id', adminProfile.id);

      console.log('[getGoogleAccessToken] Successfully refreshed access token');
      return tokens.access_token;
    } catch (error) {
      console.error('[getGoogleAccessToken] Exception refreshing token:', error);
      return null;
    }
  }

  console.error('[getGoogleAccessToken] No refresh token available');
  return null;
}

async function uploadToGoogleDrive(
  file: File,
  accessToken: string,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  try {
    // First, upload the file metadata
    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      console.error('[uploadToGoogleDrive] Upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorData.error || 'unknown',
        error_description: errorData.error?.message || errorData.error_description || 'no description',
      });
      
      // If it's an auth error, the token might be invalid
      if (uploadResponse.status === 401) {
        throw new Error('Google authentication failed. Please reconnect your Google account in the admin panel.');
      }
      
      return null;
    }

    const result = await uploadResponse.json();
    return {
      id: result.id,
      name: result.name,
    };
  } catch (error: any) {
    console.error('[uploadToGoogleDrive] Exception:', error);
    throw error; // Re-throw to propagate error message
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const bookingId = formData.get('bookingId') as string;
    const files = formData.getAll('files') as File[];

    if (!bookingId || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing bookingId or files' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    // Get the booking with google_drive_link, status, and guide_ids
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, google_drive_link, status, guide_id, guide_ids, pictureCount')
      .eq('id', parseInt(bookingId, 10))
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if tour is already completed
    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Tour is already completed. No more photos can be uploaded.' },
        { status: 403 }
      );
    }

    // Extract folder ID from google_drive_link
    const folderId = extractFolderId(booking.google_drive_link);
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'No Google Drive folder configured for this booking. Please set the google_drive_link field.' },
        { status: 400 }
      );
    }

    // Get Google access token from admin account
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Drive access not available. Please ensure an admin has connected their Google account.' },
        { status: 403 }
      );
    }

    // Upload all files to Google Drive
    const uploadResults = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const result = await uploadToGoogleDrive(file, accessToken, folderId);
        if (result) {
          uploadResults.push(result);
        } else {
          errors.push(`Failed to upload ${file.name}`);
        }
      } catch (error: any) {
        console.error(`[upload-tour-photos] Error uploading ${file.name}:`, error);
        errors.push(error.message || `Failed to upload ${file.name}`);
      }
    }

    if (uploadResults.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to upload files',
          details: errors.length > 0 ? errors.join('; ') : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Update picturesUploaded flag and pictureCount
    const pictureCount = uploadResults.length;
    const { error: updateError } = await supabase
      .from('tourbooking')
      .update({ 
        picturesUploaded: true,
        pictureCount: pictureCount
      })
      .eq('id', parseInt(bookingId, 10));

    if (!updateError) {
      // Update guide metrics when photos are uploaded for all assigned guides
      const guideIds = booking.guide_ids && booking.guide_ids.length > 0 
        ? booking.guide_ids 
        : booking.guide_id 
          ? [booking.guide_id] 
          : [];
      
      for (const guideId of guideIds) {
        await updateGuideMetrics(guideId);
      }
    }

    return NextResponse.json({
      success: true,
      uploadedFiles: uploadResults,
      message: `Successfully uploaded ${uploadResults.length} file(s) to Google Drive`,
      folderId: folderId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

