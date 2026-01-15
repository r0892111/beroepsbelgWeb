import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

function extractFolderId(link: string | null): string | null {
  if (!link) return null;
  return link.split("/").filter(p => p).pop() || null;
}

async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Google token refresh failed");
  return data.access_token;
}

async function getPermissions(fileId: string, token: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return await res.json();
}

async function deletePermission(fileId: string, permissionId: string, token: string) {
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log(`[drive-revoke] Cron triggered at ${new Date().toISOString()}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Load the Drive owner (single source of truth)
  const { data: driveProfile, error: profileError } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token")
    .eq("email", "dev@finitsolutions.be")
    .single();

  if (profileError || !driveProfile?.google_refresh_token) {
    return new Response(
      JSON.stringify({ error: "Drive owner Google account not configured" }),
      { status: 500, headers: corsHeaders },
    );
  }

  const sevenDaysAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings, error } = await supabase
    .from("tourbooking")
    .select("id,google_drive_link,tour_end")
    .not("google_drive_link", "is", null)
    .lt("tour_end", sevenDaysAgo);

  if (error) {
    return new Response(JSON.stringify(error), { status: 500, headers: corsHeaders });
  }

  let revoked = 0;

  try {
    // Always refresh before batch
    const accessToken = await refreshGoogleToken(driveProfile.google_refresh_token);

    await supabase
      .from("profiles")
      .update({ google_access_token: accessToken })
      .eq("email", "dev@finitsolutions.be");

    for (const booking of bookings ?? []) {
      const folderId = extractFolderId(booking.google_drive_link);
      if (!folderId) continue;

      try {
        const perms = await getPermissions(folderId, accessToken);
        const anyone = perms.permissions?.find((p: any) => p.type === "anyone");

        if (anyone) {
          await deletePermission(folderId, anyone.id, accessToken);
          revoked++;
          console.log(`[drive-revoke] Revoked link for booking ${booking.id}`);
        }
      } catch (err) {
        console.error(`[drive-revoke] Failed for booking ${booking.id}`, err);
      }
    }
  } catch (err) {
    console.error("[drive-revoke] Token refresh or Drive API failed", err);
  }

  return new Response(
    JSON.stringify({
      success: true,
      expiredBookings: bookings?.length ?? 0,
      linksRevoked: revoked,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
