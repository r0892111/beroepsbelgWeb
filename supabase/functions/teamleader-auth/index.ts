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
    const { code, redirect_uri: redirectUri } = body;

    if (!code) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization code is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const clientId = Deno.env.get('VITE_TEAMLEADER_CLIENT_ID');
    const clientSecret = Deno.env.get('TEAMLEADER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'TeamLeader credentials not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const tokenResponse = await fetch('https://app.teamleader.eu/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to exchange code: ${errorText}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string | undefined = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const scope: string | undefined = tokenData.scope;
    const expiresIn: number | undefined = tokenData.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    if (!accessToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access token missing in TeamLeader response'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const userResponse = await fetch('https://api.teamleader.eu/users.me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch user info'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: existingUsers, error: fetchError } = await supabase
      .from('teamleader_users')
      .select('user_id')
      .eq('teamleader_user_id', userInfo.id)
      .is('deleted_at', null);

    if (fetchError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to query existing users: ${fetchError.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const email = userInfo.email || `${userInfo.id}@teamleader.local`;
    const fullName = userInfo.first_name && userInfo.last_name
      ? `${userInfo.first_name} ${userInfo.last_name}`
      : userInfo.first_name || userInfo.last_name || 'Teamleader User';

    let userId: string;

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].user_id;

      const { error: updateError } = await supabase
        .from('teamleader_users')
        .update({
          user_info: userInfo,
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
          scope: scope ?? null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('teamleader_user_id', userInfo.id);

      if (updateError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to update Teamleader user: ${updateError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          platform: 'teamleader',
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          teamleader_user_id: userInfo.id
        }
      });

      if (authError || !authData?.user) {
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create user: ${authError?.message ?? 'Unknown error'}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      userId = authData.user.id;

      const { error: insertError } = await supabase.from('teamleader_users').insert({
        user_id: userId,
        teamleader_user_id: userInfo.id,
        user_info: userInfo,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        scope: scope ?? null,
        expires_at: expiresAt
      });

      if (insertError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to store Teamleader user: ${insertError.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (sessionError || !sessionData?.properties?.action_link) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to generate session: ${sessionError?.message ?? 'Unknown error'}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session_url: sessionData.properties.action_link,
      user_id: userId,
      teamleader_user_id: userInfo.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Teamleader auth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

