# Teamleader Redirect URI Fix

## Problem
The redirect URI was showing `http://localhost:3000/nl/admin/teamleader/callback` in production logs, causing OAuth to fail.

## Solution Applied

### 1. Client-Side Fixes
Updated all Teamleader OAuth callback pages to detect production environment and use the correct URL:
- `app/[locale]/admin/dashboard/page.tsx` - Authorization request
- `app/[locale]/admin/teamleader/callback/page.tsx` - Callback handler
- `app/admin/teamleader/callback/page.tsx` - Non-locale callback handler

The code now checks if the hostname is `beroepsbelg.be` and uses `https://beroepsbelg.be` instead of `window.location.origin`.

### 2. Supabase Function Fix
Updated `supabase/functions/teamleader-auth/index.ts` to:
- Prioritize the `redirect_uri` passed from the client
- Fall back to environment variable `TEAMLEADER_REDIRECT_URI`
- Final fallback to production URL: `https://beroepsbelg.be/admin/teamleader/callback`

## Required Action: Update Supabase Environment Variable

**IMPORTANT**: Update the `TEAMLEADER_REDIRECT_URI` environment variable in your Supabase project:

1. Go to Supabase Dashboard → Project Settings → Edge Functions → Environment Variables
2. Set `TEAMLEADER_REDIRECT_URI` to: `https://beroepsbelg.be/admin/teamleader/callback`

Or via CLI:
```bash
npx supabase secrets set TEAMLEADER_REDIRECT_URI=https://beroepsbelg.be/admin/teamleader/callback
```

## Testing

After deploying:
1. Test OAuth flow in production
2. Check Supabase function logs - should show: `redirectUri: "https://beroepsbelg.be/admin/teamleader/callback"`
3. Verify Teamleader OAuth redirects correctly

## Notes

- The redirect URI should NOT include the locale (`/nl/`) - it's `/admin/teamleader/callback`
- The callback page handles locale internally via URL params
- Local development will still use `localhost:3000` automatically
