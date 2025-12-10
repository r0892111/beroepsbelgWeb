# Stripe Webshop Sync Edge Function

This edge function automatically syncs webshop items with Stripe products and prices when items are created, updated, or deleted in the `webshop_data` table.

## How It Works

1. **On Webshop Item Creation (INSERT)**:
   - Creates a Stripe Product with item details (Name, Description, Category)
   - Creates a Stripe Price if a price is set
   - Stores Stripe IDs (`stripe_product_id`, `stripe_price_id`) in the webshop_data record

2. **On Webshop Item Update (UPDATE)**:
   - Updates the Stripe Product name, description, and metadata
   - If price changed: Archives old price, creates new price
   - Updates webshop_data record with new Stripe IDs
   - If no Stripe product exists, creates one automatically

3. **On Webshop Item Deletion (DELETE)**:
   - Deactivates the Stripe Product (sets `active: false`)
   - Deactivates the associated Stripe Price
   - Products are deactivated rather than deleted to preserve order history

## Setup Instructions

### 1. Run the Migration

The migration `20251209120000_add_stripe_ids_to_webshop_data.sql` adds the necessary columns to store Stripe IDs:

```bash
supabase db push
```

### 2. Deploy the Edge Function

```bash
supabase functions deploy sync-webshop-to-stripe
```

### 3. Set Environment Variables

In your Supabase Dashboard → Project Settings → Edge Functions → Secrets, ensure you have:

```
STRIPE_SECRET_KEY=sk_test_...
```

(If you already set this for the tour sync function, you're good to go!)

### 4. Create Webhook in Supabase Dashboard

1. Go to **Database** → **Webhooks** in your Supabase Dashboard
2. Click **Create a new hook**

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

   **HTTP Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   ```
   
   Replace `YOUR_SERVICE_ROLE_KEY` with your service role key (found in Project Settings → API → service_role secret)

   **Important:** Make sure the webhook is configured to send the `old_record` in UPDATE events. In Supabase Dashboard, when creating the webhook, ensure "Include old record" is enabled for UPDATE events. This is required for the price change detection to work properly.

4. Click **Create webhook**

## Testing

### Test Creating a Webshop Item:

1. Go to your admin panel: `/admin/products`
2. Click **Add Product**
3. Fill in:
   - Name: `Stripe Test Product`
   - Category: `Book`
   - Price (EUR): `19.99`
   - Description: `Testing Stripe integration`
4. Click **Create Product**

### Verify in Stripe:

1. Open **Stripe Dashboard** → **Products**
2. You should see: `Stripe Test Product`
3. Click on it to verify:
   - Name matches
   - Price is correct (€19.99)
   - Metadata contains `webshop_uuid`

### Test Updating:

1. Edit the product and change the price
2. Verify in Stripe that a new price was created and the old one was archived

### Test Deleting:

1. Delete a product from the admin panel
2. Verify in Stripe Dashboard that the product is deactivated (active: false)
3. The product will still exist in Stripe but won't be available for new purchases

## Troubleshooting

### Check Function Logs:

```bash
supabase functions logs sync-webshop-to-stripe
```

Or in Supabase Dashboard → Edge Functions → sync-webshop-to-stripe → Logs

### Common Issues:

**Issue: Webshop item created but no Stripe product**
- Check webhook is enabled and configured correctly
- Verify STRIPE_SECRET_KEY is set
- Check function logs for errors

**Issue: Price not updating**
- Verify the Price (EUR) field changed
- Check that price value is greater than 0
- Old price should be archived, new price created

## What Gets Synced

- **Product Name**: From `webshop_data.Name`
- **Product Description**: From `webshop_data.Description`
- **Price**: From `webshop_data.Price (EUR)` (converted to cents)
- **Metadata**: Includes `webshop_uuid` and `category`

## Stripe IDs Storage

After syncing, the webshop_data record will contain:
- `stripe_product_id`: The Stripe Product ID
- `stripe_price_id`: The Stripe Price ID (if price is set)

These can be used directly in checkout sessions without needing to look up Stripe products.

