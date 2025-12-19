import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
Deno.serve(async (req)=>{
  console.log('🟢 Incoming request:', req.method);
  if (req.method === 'OPTIONS') {
    console.log('🟡 CORS preflight');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    console.log('🔧 Initializing Supabase');
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: {
        persistSession: false
      }
    });
    // Fetch all profiles that have either refresh token
    console.log('📡 Fetching all profiles with refresh tokens...');
    const { data: profiles, error } = await supabase.from('profiles').select('id, refresh_token_tl, google_refresh_token');
    if (error) {
      console.error('❌ Supabase fetch error:', error.message);
      throw new Error('Failed to fetch profiles');
    }
    console.log(`✅ Found ${profiles?.length || 0} profiles`);
    const results = [];
    for (const profile of profiles){
      const updates = {};
      const userId = profile.id;
      console.log(`\n🔄 Processing user: ${userId}`);

     // ================================
// TEAMLEADER TOKEN (ALWAYS SAVE)
// ================================
if (profile.refresh_token_tl) {
  console.log('🔁 Refreshing Teamleader token...');
  try {
    const res = await fetch('https://app.teamleader.eu/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: profile.refresh_token_tl,
        client_id: Deno.env.get('TEAMLEADER_CLIENT_ID'),
        client_secret: Deno.env.get('TEAMLEADER_CLIENT_SECRET'),
      }),
    });

    const data = await res.json();

    // ❌ If this fails, nothing to save
    if (!res.ok) {
      console.error(`❌ Teamleader refresh failed for user ${userId}:`, data);
      return;
    }

    // ✅ ALWAYS overwrite tokens
    updates.access_token_tl = data.access_token;
    updates.refresh_token_tl = data.refresh_token;

    console.log('✅ Teamleader tokens saved (forced overwrite)', {
      accessTokenLength: data.access_token?.length,
      refreshTokenLength: data.refresh_token?.length,
    });
  } catch (err) {
    console.error(`❌ Exception refreshing Teamleader for user ${userId}:`, err);
  }
}

      // ================================
      // GOOGLE TOKEN
      // ================================
      if (profile.google_refresh_token) {
        console.log('🔁 Refreshing Google token...');
        try {
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
              refresh_token: profile.google_refresh_token,
              grant_type: 'refresh_token'
            })
          });
          if (!res.ok) {
            const errTxt = await res.text();
            console.error(`❌ Google refresh failed for user ${userId}:`, errTxt);
          } else {
            const data = await res.json();
            updates.google_access_token = data.access_token;
            console.log('✅ Google refreshed:', {
              accessTokenLength: data.access_token?.length
            });
          }
        } catch (err) {
          console.error(`❌ Exception refreshing Google for user ${userId}:`, err);
        }
      }
      // ================================
      // SAVE UPDATES
      // ================================
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        try {
          const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId);
          if (updateError) {
            console.error(`❌ Supabase update failed for user ${userId}:`, updateError.message);
          } else {
            console.log(`💾 Tokens saved successfully for user ${userId}`);
            results.push({
              user_id: userId,
              updated: true
            });
          }
        } catch (err) {
          console.error(`❌ Exception saving tokens for user ${userId}:`, err);
        }
      } else {
        console.log(`ℹ️ No tokens to refresh for user ${userId}`);
        results.push({
          user_id: userId,
          updated: false
        });
      }
    }
    // Return summary
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('🔥 Fatal refresh error:', err.message || err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
