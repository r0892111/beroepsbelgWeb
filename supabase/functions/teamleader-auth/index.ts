import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    const { action, code, redirect_uri: redirectUri, user_id: userId } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Supabase configuration missing'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const clientId = Deno.env.get('TEAMLEADER_CLIENT_ID');
    const clientSecret = Deno.env.get('TEAMLEADER_CLIENT_SECRET');
    const redirectFallback = Deno.env.get('TEAMLEADER_REDIRECT_URI');
    const scopeEnv = Deno.env.get('TEAMLEADER_SCOPE');
    const scopeDefault = 'users contacts companies deals invoices products';
    const resolvedRedirectUri = redirectUri ?? redirectFallback;

    // Action: authorize - Generate OAuth authorization URL
    if (action === 'authorize') {
      if (!clientId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'TeamLeader client ID not configured'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!resolvedRedirectUri) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Redirect URI not provided'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const state = crypto.randomUUID();
      const authorizationUrl = new URL('https://app.teamleader.eu/oauth2/authorize');
      authorizationUrl.searchParams.set('response_type', 'code');
      authorizationUrl.searchParams.set('client_id', clientId);
      authorizationUrl.searchParams.set('redirect_uri', resolvedRedirectUri);
      authorizationUrl.searchParams.set('scope', scopeEnv ?? scopeDefault);
      authorizationUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({
        success: true,
        authorization_url: authorizationUrl.toString(),
        state
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Action: status - Get Teamleader user info from profiles table
    if (action === 'status') {
      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User ID required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('"TeamLeader UserInfo"')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        integration: data?.['TeamLeader UserInfo'] ?? null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Exchange OAuth code for token and save user info
    if (!code) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization code is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'TeamLeader credentials not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://app.teamleader.eu/oauth2/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: resolvedRedirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to exchange code: ${errorText}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;
    const scope = tokenData.scope;

    if (!accessToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access token missing in TeamLeader response'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate expiration time
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Fetch user info from TeamLeader
    const userResponse = await fetch('https://api.teamleader.eu/users.me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch user info'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await userResponse.json();
    const userInfo = userData.data;

    if (!userInfo?.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User info response missing id'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare Teamleader data with tokens and user info
    const teamleaderData = {
      user_info: userInfo,
      access_token: accessToken,
      refresh_token: refreshToken || null,
      scope: scope || null,
      expires_at: expiresAt,
      teamleader_user_id: userInfo.id
    };

    // Save Teamleader data (user info + tokens) to profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        'TeamLeader UserInfo': teamleaderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to save Teamleader user info: ${updateError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      teamleader_user_id: userInfo.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Teamleader auth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
