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
    const scopeEnv = Deno.env.get('TEAMLEADER_SCOPE');
    const scopeDefault = 'users contacts companies deals invoices products';

    console.log("🔧 OAuth config:", {
      clientIdPresent: !!clientId,
      redirectUri: redirectUri,
      scope: scopeEnv ?? scopeDefault
    });

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

      const hasIntegration = !!(data?.access_token_tl && data?.refresh_token_tl);

      return new Response(JSON.stringify({
        success: true,
        integration: hasIntegration ? {
          connected: true,
          user_info: data['TeamLeader UserInfo'] || null,
        } : null,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

      if (!redirectUri) {
        return new Response(JSON.stringify({
          success: false, error: 'redirect_uri is required'
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const state = crypto.randomUUID();

      const authorizationUrl = new URL('https://app.teamleader.eu/oauth2/authorize');
      authorizationUrl.searchParams.set('response_type', 'code');
      authorizationUrl.searchParams.set('client_id', clientId);
      authorizationUrl.searchParams.set('redirect_uri', redirectUri);
      authorizationUrl.searchParams.set('scope', scopeEnv ?? scopeDefault);
      authorizationUrl.searchParams.set('state', state);

      console.log("🔗 Authorization URL created:", authorizationUrl.toString());

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
        return new Response(JSON.stringify({
          success: false, error: 'Failed to disconnect Teamleader'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true, message: 'Teamleader disconnected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------
    // TOKEN EXCHANGE
    // ------------------------------------------------------
    if (action === 'exchange') {
      console.log("🔁 Starting token exchange…");

      if (!code) {
        return new Response(JSON.stringify({ success: false, error: 'Authorization code required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: 'User ID required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!redirectUri) {
        return new Response(JSON.stringify({ success: false, error: 'redirect_uri required for token exchange' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log("🔑 Token exchange params:", {
        clientIdPresent: !!clientId,
        clientSecretPresent: !!clientSecret,
        redirectUri,
        codePreview: code.substring(0, 10) + "..."
      });

      const tokenResponse = await fetch('https://app.teamleader.eu/oauth2/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      const tokenData = await tokenResponse.json();
      console.log("🔑 Token exchange result:", {
        ok: tokenResponse.ok,
        status: tokenResponse.status,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token
      });

      if (!tokenResponse.ok) {
        console.error("❌ Token exchange failed:", tokenData);
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
      console.log("👤 Teamleader user response status:", userResponse.ok);

      if (!userResponse.ok) {
        console.error("❌ Failed to fetch user info:", userData);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch user info from Teamleader'
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userInfo = userData.data;

      // ------------------------------------------------------
      // SAVE TOKENS + PROFILE
      // ------------------------------------------------------
      console.log("💾 SAVING TO SUPABASE…");
      console.log("📝 DATA TO SAVE:", {
        userId,
        accessTokenPreview: accessToken?.substring(0, 8) + "...",
        refreshTokenPreview: refreshToken?.substring(0, 8) + "...",
        userInfoPresent: !!userInfo
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

      console.log("📤 SUPABASE UPDATE RESULT:", { 
        hasError: !!updateError, 
        errorMessage: updateError?.message,
        returnedDataCount: returnedData?.length 
      });

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
        teamleader_user_id: userInfo.id,
        user_info: userInfo
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------
    // INVALID ACTION
    // ------------------------------------------------------
    return new Response(JSON.stringify({
      success: false,
      error: `Invalid action: ${action}. Valid actions are: status, authorize, disconnect, exchange`
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
