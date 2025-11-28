import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, code, redirect_uri, state } = await req.json();

    if (action === 'authorize') {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not configured');
      }

      const randomState = crypto.randomUUID();
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirect_uri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', randomState);

      console.log('Authorization request - redirect_uri:', redirect_uri);

      return new Response(
        JSON.stringify({
          success: true,
          authorization_url: authUrl.toString(),
          state: randomState,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'exchange') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth credentials not configured');
      }

      console.log('Token exchange - redirect_uri:', redirect_uri);
      console.log('Token exchange - code length:', code?.length);

      const tokenParams = {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      };

      console.log('Token exchange params (without secrets):', {
        code_length: code?.length,
        redirect_uri,
        grant_type: 'authorization_code',
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenParams),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        console.error('Status:', tokenResponse.status);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange successful, has refresh_token:', !!tokens.refresh_token);

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to save tokens:', updateError);
        throw new Error('Failed to save Google tokens');
      }

      console.log('Tokens saved successfully for user:', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          user_info: userInfo,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Google OAuth error:', error);
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
