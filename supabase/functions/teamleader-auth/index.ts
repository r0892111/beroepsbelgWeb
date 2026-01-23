import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

Deno.serve(async (req) => {
  console.log("🔵 Incoming request:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, code, redirect_uri: redirectUri, user_id: userId } = body;

    console.log("📥 Request body:", body);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("❌ Missing Supabase env vars");
      return new Response(JSON.stringify({
        success: false,
        error: 'Supabase configuration missing'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const clientId = Deno.env.get('TEAMLEADER_CLIENT_ID');
    const clientSecret = Deno.env.get('TEAMLEADER_CLIENT_SECRET');
    const redirectFallback = Deno.env.get('TEAMLEADER_REDIRECT_URI');
    const scopeEnv = Deno.env.get('TEAMLEADER_SCOPE');
    const scopeDefault = 'users contacts companies deals invoices products';

    // Prioritize the redirect_uri passed from client, fallback to env var
    // If redirectUri is provided, use it (even if it's localhost for dev)
    // Only use fallback if redirectUri is explicitly not provided
    const resolvedRedirectUri = redirectUri || redirectFallback || 'https://beroepsbelg.be/admin/teamleader/callback';

    console.log("🔧 OAuth config:", {
      clientIdPresent: !!clientId,
      redirectUri: resolvedRedirectUri,
      scope: scopeEnv ?? scopeDefault
    });

    // ------------------------------------------------------
    // AUTHORIZE
    // ------------------------------------------------------
    if (action === 'authorize') {
      if (!clientId) {
        return new Response(JSON.stringify({
          success: false, error: 'TeamLeader client ID missing'
        }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ------------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------------
    if (action === 'disconnect') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          access_token_tl: null,
          refresh_token_tl: null,
          'TeamLeader UserInfo': null
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Failed to disconnect Teamleader:', updateError);
        throw new Error('Failed to disconnect Teamleader');
      }

      return new Response(JSON.stringify({
        success: true, message: 'Teamleader disconnected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------
    if (action === 'status') {
      console.log("➡️ STATUS CHECK for user:", userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('"TeamLeader UserInfo", access_token_tl, refresh_token_tl')
        .eq('id', userId)
        .maybeSingle();

      console.log("📊 STATUS RESULT:", data);

      if (error) {
        return new Response(JSON.stringify({
          success: false, error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        integration: data?.['TeamLeader UserInfo'] ?? null
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------
    // TOKEN EXCHANGE
    // ------------------------------------------------------
    console.log("🔁 Starting token exchange…");

    if (!code)
      return new Response(JSON.stringify({ success: false, error: 'Authorization code required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    if (!userId)
      return new Response(JSON.stringify({ success: false, error: 'User ID required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

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

    const tokenData = await tokenResponse.json();

    console.log("🔑 Token exchange result:", tokenData);

    if (!tokenResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token exchange failed',
        details: tokenData
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    console.log("🟦 ACCESS TOKEN LENGTH:", accessToken?.length);
    console.log("🟩 REFRESH TOKEN LENGTH:", refreshToken?.length);

    // Fetch Teamleader profile
    const userResponse = await fetch('https://api.teamleader.eu/users.me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = await userResponse.json();
    console.log("👤 Teamleader user response:", userData);

    const userInfo = userData.data;

    // ------------------------------------------------------
    // SAVE TOKENS + PROFILE
    // ------------------------------------------------------

    console.log("💾 SAVING TO SUPABASE…");
    console.log("📝 DATA TO SAVE:", {
      userId,
      accessTokenPreview: accessToken?.substring(0, 8) + "...",
      refreshTokenPreview: refreshToken?.substring(0, 8) + "...",
      userInfo
    });

    const { error: updateError, data: returnedData } = await supabase
      .from('profiles')
      .update({
        'TeamLeader UserInfo': {
          user_info: userInfo,
          teamleader_user_id: userInfo.id,
          scope: tokenData.scope ?? null,
          expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null
        },
        access_token_tl: accessToken,
        refresh_token_tl: refreshToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    console.log("📤 SUPABASE UPDATE RESULT:", { updateError, returnedData });

    if (updateError) {
      console.error("❌ FAILED TO SAVE:", updateError);
      return new Response(JSON.stringify({
        success: false,
        error: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ SUCCESSFULLY STORED TOKENS & USER INFO");

    return new Response(JSON.stringify({
      success: true,
      teamleader_user_id: userInfo.id
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("🔥 Unexpected error:", error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message ?? 'Internal error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
