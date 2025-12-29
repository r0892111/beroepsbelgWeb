# Webshop to Stripe Sync Setup Guide

## Problem: Auto-sync not working

If products are created but not syncing to Stripe automatically, the database webhook/trigger is likely not configured.

## Solution Options

### Option 1: Use Supabase Dashboard Webhook (Recommended)

This is the easiest and most reliable method:

1. **Go to Supabase Dashboard** → **Database** → **Webhooks**
2. **Click "Create a new hook"**
3. **Configure the webhook:**

   **Basic Settings:**
   - Name: `Sync Webshop to Stripe`
   - Table: `webshop_data`
   - Events: Check ✅ **Insert**, ✅ **Update**, and ✅ **Delete**

   **HTTP Request:**
   - Type: `HTTP Request`
   - Method: `POST`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-webshop-to-stripe`
     
     Replace `YOUR_PROJECT_REF` with your actual project reference (found in Project Settings → General)
     
     Example: `https://rwrfobawfbfsggczofao.supabase.co/functions/v1/sync-webshop-to-stripe`

   **HTTP Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   ```
   
   Replace `YOUR_SERVICE_ROLE_KEY` with your service role key (found in Project Settings → API → service_role secret)

   **Important:** 
   - Make sure "Include old record" is enabled for UPDATE events (required for price change detection)
   - The webhook should be active/enabled

4. **Click "Create webhook"**

### Option 2: Use Database Trigger (Alternative)

If you prefer a database trigger, you can run the migration:

```bash
supabase db push
```

This will create a trigger that calls the edge function. However, this requires:
- The `http` extension to be enabled in Supabase
- Environment variables set: `app.settings.supabase_url` and `app.settings.service_role_key`

**Note:** Database triggers using `http` extension may not work in all Supabase setups. The Dashboard webhook method (Option 1) is more reliable.

## Verify Setup

### Check if Webhook Exists:

1. Go to **Supabase Dashboard** → **Database** → **Webhooks**
2. Look for a webhook named "Sync Webshop to Stripe" or similar
3. Check that it's:
   - ✅ Active/Enabled
   - ✅ Configured for `webshop_data` table
   - ✅ Has Insert, Update, Delete events checked
   - ✅ Points to correct edge function URL

### Test the Sync:

1. **Create a test product** in your admin panel (`/admin/products`)
2. **Check Edge Function logs:**
   ```bash
   supabase functions logs sync-webshop-to-stripe
   ```
   Or in Supabase Dashboard → Edge Functions → sync-webshop-to-stripe → Logs

3. **Verify in Stripe Dashboard:**
   - Go to Stripe Dashboard → Products
   - You should see the new product
   - Check that `stripe_product_id` and `stripe_price_id` are populated in your database

## Troubleshooting

### Issue: Webhook not firing

**Check:**
- Webhook is enabled in Dashboard
- Edge function is deployed: `supabase functions deploy sync-webshop-to-stripe`
- `STRIPE_SECRET_KEY` is set in Edge Function secrets
- Edge function URL is correct

### Issue: Edge function errors

**Check logs:**
```bash
supabase functions logs sync-webshop-to-stripe --tail
```

**Common errors:**
- Missing `STRIPE_SECRET_KEY` → Set in Dashboard → Edge Functions → Secrets
- Invalid product data → Check that Name, Price (EUR) fields are filled
- Network errors → Check edge function URL is accessible

### Issue: Product created but no Stripe product

**Check:**
1. Webhook is configured and active
2. Edge function logs show the request was received
3. Stripe API key is valid
4. Product has a valid price (Price (EUR) > 0)

## Manual Sync (If Needed)

If auto-sync is not working, you can manually sync products using the import script:

```bash
# Run the import script
npm run import-webshop-to-stripe
# or
ts-node scripts/import-webshop-to-stripe.ts
```

This will sync all products in `webshop_data` that don't have Stripe IDs yet.

