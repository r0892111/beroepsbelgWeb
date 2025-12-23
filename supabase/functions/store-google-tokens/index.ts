import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { userId, accessToken, refreshToken } = await req.json()

    if (!userId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'userId and accessToken are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get existing profile to preserve refresh token if new one isn't provided
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is okay for first-time setup
      console.error('Error fetching existing profile:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare update object - always update access token, update refresh token only if new one is provided
    const updateData: {
      google_access_token: string
      google_refresh_token?: string
      updated_at: string
    } = {
      google_access_token: accessToken,
      updated_at: new Date().toISOString(),
    }

    // Only update refresh token if we have a new one, otherwise keep the existing one
    if (refreshToken) {
      updateData.google_refresh_token = refreshToken
    } else if (existingProfile?.google_refresh_token) {
      // Preserve existing refresh token if new one isn't provided (Google only returns it once)
      updateData.google_refresh_token = existingProfile.google_refresh_token
    }

    // Always update with the new access token (and refresh token if available)
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error storing Google tokens:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to store Google tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessToken: true,
        refreshToken: !!updateData.google_refresh_token,
        refreshTokenUpdated: !!refreshToken,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})


