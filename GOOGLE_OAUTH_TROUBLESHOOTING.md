# Google OAuth Authentication Error Troubleshooting

## Error: 401 UNAUTHENTICATED

This error occurs when Google OAuth credentials are invalid, expired, or missing.

## Common Causes

1. **Access token expired** - Access tokens expire after 1 hour
2. **Refresh token invalid** - Refresh tokens can be revoked or expire
3. **Google OAuth credentials missing** - `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set
4. **Admin account not connected** - No admin has connected their Google account
5. **Token revoked** - User revoked access in Google account settings

## Solutions

### Solution 1: Reconnect Google Account (Most Common Fix)

1. Go to Admin Dashboard: `/{locale}/admin/dashboard`
2. Find the Google integration section
3. Click "Disconnect" if connected
4. Click "Connect Google Account" again
5. Complete the OAuth flow
6. This will generate new access and refresh tokens

### Solution 2: Check Environment Variables

Verify these are set in your environment:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**For Next.js API routes:**
- Set in `.env.local` or your hosting platform's environment variables

**For Supabase Edge Functions:**
- Set via: `npx supabase secrets set GOOGLE_CLIENT_ID=your-id`
- Set via: `npx supabase secrets set GOOGLE_CLIENT_SECRET=your-secret`

### Solution 3: Verify Google Cloud Console Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Check your OAuth 2.0 Client ID:
   - **Authorized redirect URIs** must include:
     - `https://your-project.supabase.co/functions/v1/google-oauth` (for Supabase functions)
     - Your app's callback URL (for Next.js routes)
   - **Authorized JavaScript origins** should include your domain

### Solution 4: Check Database for Admin with Google Tokens

Run this SQL query in Supabase:

```sql
SELECT 
  id, 
  email,
  isAdmin,
  is_admin,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token
FROM profiles
WHERE isAdmin = true OR is_admin = true;
```

If no admin has `google_refresh_token`, you need to connect an admin account.

### Solution 5: Clear Invalid Tokens

If tokens are corrupted, clear them:

```sql
UPDATE profiles
SET google_access_token = NULL, google_refresh_token = NULL
WHERE id = 'admin-user-id';
```

Then reconnect the Google account.

## How the Token Refresh Works

1. **Access Token** - Valid for 1 hour, used for API calls
2. **Refresh Token** - Long-lived, used to get new access tokens
3. **Auto-Refresh** - System automatically refreshes access tokens when they expire
4. **Validation** - Before using an access token, system validates it

## Debugging Steps

### Step 1: Check Logs

Look for these log messages:
- `[getGoogleAccessToken] Starting...`
- `[getGoogleAccessToken] Found admin profile: ...`
- `[getGoogleAccessToken] Token refresh failed: ...`
- `[getGoogleAccessToken] Refresh token is invalid, clearing from database`

### Step 2: Test Token Manually

Test if a token is valid:

```bash
curl "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=YOUR_ACCESS_TOKEN"
```

Should return token info if valid, or error if invalid.

### Step 3: Test Refresh Token

Test refresh token manually:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

Should return new access token if valid.

## Prevention

1. **Regular Token Refresh** - The system automatically refreshes tokens
2. **Monitor Expiration** - Set up alerts for token refresh failures
3. **Multiple Admin Accounts** - Connect multiple admin accounts as backup
4. **Regular Reconnection** - Reconnect Google account every 6 months

## Still Having Issues?

1. Check Supabase function logs for detailed error messages
2. Verify Google Cloud Console OAuth consent screen is configured
3. Ensure required scopes are requested:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
4. Check if Google account has 2FA enabled (should still work)
5. Verify redirect URIs match exactly (including trailing slashes)
