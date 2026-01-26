# Stripe Webhook Setup Guide

## Problem: Edge Function Not Being Triggered

If Stripe payments complete but your `stripe-webhook` Edge Function isn't being called, the webhook isn't configured correctly in Stripe Dashboard.

## Solution: Configure Stripe Webhook

### Step 1: Get Your Webhook URL

Your Supabase Edge Function webhook URL is:
```
https://rwrfobawfbfsggczofao.supabase.co/functions/v1/stripe-webhook
```

### Step 2: Add Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click "Add endpoint"** (or edit existing endpoint if one exists)
3. **Enter the endpoint URL:**
   ```
   https://rwrfobawfbfsggczofao.supabase.co/functions/v1/stripe-webhook
   ```
4. **Select events to listen to:**
   - ✅ `checkout.session.completed` (REQUIRED - for tour bookings and webshop orders)
   - ✅ `customer.subscription.created` (for subscriptions)
   - ✅ `customer.subscription.updated` (for subscriptions)
   - ✅ `customer.subscription.deleted` (for subscriptions)
   - ✅ `invoice.payment_succeeded` (for subscription invoices)
   - ✅ `invoice.payment_failed` (for failed subscription invoices)

5. **Click "Add endpoint"**

### Step 3: Copy Webhook Signing Secret

1. After creating the webhook, click on it to view details
2. **Copy the "Signing secret"** (starts with `whsec_...`)
3. **Important:** Make sure you're copying the secret for the **LIVE** mode webhook if you're processing live payments, or **TEST** mode if testing

### Step 4: Add Secret to Supabase

1. **Go to Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. **Click "Manage secrets"**
3. **Add/Update secret:**
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: Paste the signing secret from Step 3 (e.g., `whsec_...`)
4. **Click "Save"**

### Step 5: Verify Edge Function is Deployed

Make sure the `stripe-webhook` function is deployed:

```bash
cd supabase
supabase functions deploy stripe-webhook
```

Or check in Supabase Dashboard → Edge Functions → `stripe-webhook` → Make sure it shows as deployed

## Testing

### Test with Stripe Test Mode

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. **Find your webhook endpoint**
3. **Click "Send test webhook"**
4. **Select event:** `checkout.session.completed`
5. **Click "Send test webhook"**
6. **Check Supabase logs:**
   - Go to Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - You should see: `[Webhook] Received request` and `[Webhook] Signature verified`

### Test with Real Payment

1. Create a test booking on your site
2. Complete payment in Stripe test mode
3. **Check Stripe Dashboard** → **Webhooks** → Your endpoint → **Recent events**
   - Should show `checkout.session.completed` event
   - Status should be `200 OK` (green)
4. **Check Supabase logs** to verify the function processed the event

## Troubleshooting

### Issue: Webhook shows "Failed" in Stripe Dashboard

**Possible causes:**
1. **Wrong URL** - Double-check the URL matches exactly: `https://rwrfobawfbfsggczofao.supabase.co/functions/v1/stripe-webhook`
2. **Function not deployed** - Deploy the function: `supabase functions deploy stripe-webhook`
3. **CORS error** - The function handles CORS, but if you see CORS errors, check the function code
4. **Timeout** - Check Supabase logs for timeout errors

**Solution:**
- Check Supabase Edge Function logs for error messages
- Verify the function is deployed and active
- Test the endpoint manually with curl (see below)

### Issue: "Signature verification failed" in logs

**Cause:** The `STRIPE_WEBHOOK_SECRET` doesn't match the signing secret in Stripe

**Solution:**
1. Go to Stripe Dashboard → Webhooks → Your endpoint → **Reveal signing secret**
2. Copy the secret (make sure it's for the correct mode: test vs live)
3. Update `STRIPE_WEBHOOK_SECRET` in Supabase Edge Functions secrets
4. Test again

### Issue: Webhook not receiving events at all

**Possible causes:**
1. **Webhook not configured** - Follow Step 2 above
2. **Wrong mode** - Make sure webhook is configured for the correct Stripe mode (test vs live)
3. **Events not selected** - Make sure `checkout.session.completed` is selected in webhook settings

**Solution:**
- Verify webhook exists in Stripe Dashboard
- Check that events are selected
- Check that you're testing in the same mode (test/live) as configured

### Issue: Function receives request but doesn't process

**Check logs for:**
- `[Webhook] Received request` ✅ (function is being called)
- `[Webhook] Signature verified` ✅ (signature is correct)
- `[handleEvent] Processing event` ✅ (event handler started)
- Any error messages after this point

**Common errors:**
- Missing `pending_tour_bookings` entry (booking wasn't created before payment)
- Database errors (check Supabase logs)
- Missing required fields in booking data

## Manual Testing

### Test the endpoint directly:

```bash
curl -X POST https://rwrfobawfbfsggczofao.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"test": "data"}'
```

This should return an error about signature verification, which confirms the endpoint is accessible.

### Check Function Logs:

```bash
supabase functions logs stripe-webhook --tail
```

Or in Supabase Dashboard:
- Go to **Edge Functions** → **stripe-webhook** → **Logs**

## Important Notes

1. **Test vs Live Mode:**
   - You need separate webhooks for test and live mode in Stripe
   - Make sure `STRIPE_WEBHOOK_SECRET` matches the mode you're using
   - Test mode secret starts with `whsec_test_...`
   - Live mode secret starts with `whsec_live_...`

2. **Webhook Secret:**
   - The secret is different for each webhook endpoint
   - If you delete and recreate the webhook, you MUST update the secret in Supabase

3. **Event Selection:**
   - At minimum, you need `checkout.session.completed`
   - Other events are optional but recommended for full functionality

4. **Function Deployment:**
   - After updating the function code, redeploy: `supabase functions deploy stripe-webhook`
   - Changes take effect immediately after deployment

## Quick Checklist

- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] URL is correct: `https://rwrfobawfbfsggczofao.supabase.co/functions/v1/stripe-webhook`
- [ ] `checkout.session.completed` event is selected
- [ ] Webhook signing secret copied from Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase Edge Functions secrets
- [ ] `stripe-webhook` function is deployed
- [ ] Test webhook works in Stripe Dashboard
- [ ] Function logs show webhook being received
