# Setup Guide: Stripe Tour Sync Webhook

## Quick Setup (5 minutes)

### Step 1: Deploy the Edge Function

```bash
cd supabase
supabase functions deploy sync-tour-to-stripe
```

### Step 2: Add Stripe Secret to Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Project Settings** → **Edge Functions**
3. Click on **Manage secrets**
4. Add new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
5. Click **Save**

### Step 3: Create Webhook in Supabase Dashboard

1. Go to **Database** → **Webhooks** in your Supabase Dashboard
2. Click **Enable Webhooks** (if first time)
3. Click **Create a new hook**

4. **Configure the webhook:**

   **Basic Settings:**
   - Name: `Sync Tour to Stripe`
   - Table: `tours_table_prod`
   - Events: Check both ✅ **Insert** and ✅ **Update**

   **HTTP Request:**
   - Type: `HTTP Request`
   - Method: `POST`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-tour-to-stripe`
     
     Replace `YOUR_PROJECT_REF` with your actual project reference (found in Project Settings → General)

   **HTTP Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   ```
   
   Replace `YOUR_SERVICE_ROLE_KEY` with your service role key (found in Project Settings → API → service_role secret)

   **HTTP Parameters:**
   - Leave empty

5. Click **Create webhook**

## Step 4: Test It!

### Test Creating a Tour:

1. Go to your admin panel: `/admin/tours`
2. Click **Add Tour**
3. Fill in:
   - City: `Antwerpen`
   - Title: `Stripe Test Tour`
   - Type: `Walking`
   - Duration: `120` minutes
   - Price: `25.50`
   - Languages: Select at least one
   - Description: `Testing Stripe integration`
4. Click **Create Tour**

### Verify in Stripe:

1. Open **Stripe Dashboard** → **Products**
2. You should see: `Stripe Test Tour`
3. Click on it to verify:
   - Price: €25.50
   - Metadata includes tour details
4. In your database, check the tour's `options` field - it should now contain:
   ```json
   {
     "stripe_product_id": "prod_...",
     "stripe_price_id": "price_..."
   }
   ```

### Test Updating Price:

1. In admin panel, edit the tour
2. Change price from `25.50` to `30.00`
3. Click **Update Tour**
4. In Stripe Dashboard:
   - The old €25.50 price should be archived
   - A new €30.00 price should be active

## Troubleshooting

### View Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions** → `sync-tour-to-stripe`
2. Click **Logs** tab
3. Look for any errors

### Check Webhook Status

1. Go to **Database** → **Webhooks**
2. Find your webhook
3. Check **Recent deliveries** for status
4. Click on a delivery to see request/response details

### Common Issues

**Issue: "Stripe secret key not configured"**
- Solution: Make sure you added `STRIPE_SECRET_KEY` in Edge Functions secrets

**Issue: Webhook shows "Failed"**
- Solution: Check the webhook logs for specific error
- Verify the Authorization header has the correct service role key
- Ensure Edge Function is deployed successfully

**Issue: Tour created but no Stripe product**
- Solution: 
  - Check webhook is enabled and active
  - Verify the webhook URL is correct
  - Check Edge Function logs for errors

**Issue: "Authorization header required"**
- Solution: Add the Authorization header with your service role key to the webhook configuration

## What Happens Behind the Scenes

### On Tour Creation (INSERT):
```
User creates tour 
  ↓
Database INSERT trigger
  ↓
Webhook fires → Edge Function
  ↓
Creates Stripe Product
  ↓
Creates Stripe Price (if price exists)
  ↓
Updates tour with Stripe IDs
```

### On Tour Update (UPDATE):
```
User updates tour
  ↓
Database UPDATE trigger
  ↓
Webhook fires → Edge Function
  ↓
Updates Stripe Product info
  ↓
If price changed:
  - Archives old price
  - Creates new price
  ↓
Updates tour with new Stripe IDs
```

## Security Notes

- ✅ Service role key is only used server-side
- ✅ Stripe secret key is stored securely in Edge Function secrets
- ✅ No sensitive keys exposed to client
- ✅ Webhook validates requests are from your Supabase instance

## Next Steps

After setup:
- ✅ All new tours automatically sync to Stripe
- ✅ Price updates automatically create new Stripe prices
- ✅ Stripe product IDs stored in tour options
- ✅ Ready to integrate with checkout flow

Need help? Check the Edge Function logs for detailed error messages!






