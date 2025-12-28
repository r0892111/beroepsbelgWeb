# Stripe Tour Sync Edge Function

This edge function automatically syncs tours with Stripe products and prices when tours are created or updated in the database.

## How It Works

1. **On Tour Creation (INSERT)**:
   - Creates a Stripe Product with tour details
   - Creates a Stripe Price if a price is set
   - Stores Stripe IDs in the tour's `options` field

2. **On Tour Update (UPDATE)**:
   - Updates the Stripe Product name and metadata
   - If price changed: Archives old price, creates new price
   - Updates tour record with new Stripe IDs

## Setup Instructions

### 1. Deploy the Edge Function

```bash
supabase functions deploy sync-tour-to-stripe
```

### 2. Set Environment Variables

In your Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

```
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Run the Migration

The migration file `20251207120000_add_sync_tour_to_stripe_webhook.sql` needs to be applied to your database.

**Important**: Before running the migration, you need to configure two settings in your Supabase database:

```sql
-- Set your Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';

-- Set your Service Role Key (from Supabase Dashboard → Project Settings → API)
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

Then run the migration:

```bash
supabase db push
```

### 4. Alternative: Manual Webhook Setup (Recommended)

Instead of using the database trigger, you can set up webhooks in Supabase Dashboard:

1. Go to **Database** → **Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Name**: Sync Tour to Stripe
   - **Table**: `tours_table_prod`
   - **Events**: Check `Insert` and `Update`
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://your-project.supabase.co/functions/v1/sync-tour-to-stripe`
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Payload**: 
     ```json
     {
       "type": "{{ event.type }}",
       "table": "{{ event.table }}",
       "record": {{ event.data.new }},
       "old_record": {{ event.data.old }}
     }
     ```

4. Click **Create Webhook**

## Testing

### Test Creating a Tour

1. Go to your admin panel at `/admin/tours`
2. Click "Add Tour"
3. Fill in the form with:
   - City: Antwerpen
   - Title: Test Tour
   - Type: Walking
   - Duration: 120 minutes
   - Price: 25 (euros)
   - Languages: Nederlands, Engels
   - Description: A test tour
4. Click "Create Tour"

### Verify in Stripe

1. Go to your Stripe Dashboard
2. Navigate to **Products**
3. You should see a new product named "Test Tour"
4. Click on it to see:
   - Description matches your tour description
   - Metadata includes tour_id, city, type, duration, etc.
   - A price of €25.00

### Test Updating a Tour

1. In admin panel, click "Edit" on a tour
2. Change the price (e.g., from €25 to €30)
3. Click "Update Tour"

### Verify Update in Stripe

1. Go back to Stripe Dashboard → Products
2. Find the updated tour
3. You should see:
   - The old €25 price is now "Archived"
   - A new active price of €30.00

## Tour Options Structure

After syncing, the tour's `options` field will contain:

```json
{
  "stripe_product_id": "prod_ABC123",
  "stripe_price_id": "price_XYZ789",
  ... other options ...
}
```

## Troubleshooting

### Check Edge Function Logs

```bash
supabase functions logs sync-tour-to-stripe
```

Or in Supabase Dashboard → Edge Functions → sync-tour-to-stripe → Logs

### Common Issues

1. **"Stripe secret key not configured"**
   - Make sure you added `STRIPE_SECRET_KEY` to Edge Function secrets

2. **Webhook not triggering**
   - Verify webhook is active in Database → Webhooks
   - Check webhook logs for errors
   - Ensure service role key is correct

3. **Product created but not linked to tour**
   - Check edge function logs
   - Verify the tour's `options` field is a valid JSONB object

## Webhook Payload Structure

### INSERT Event
```json
{
  "type": "INSERT",
  "table": "tours_table_prod",
  "record": {
    "id": "uuid",
    "city": "Antwerpen",
    "title": "Tour Name",
    "price": 25.00,
    ... all tour fields ...
  }
}
```

### UPDATE Event
```json
{
  "type": "UPDATE",
  "table": "tours_table_prod",
  "record": { ... new data ... },
  "old_record": { ... old data ... }
}
```

## Security

- The edge function uses Supabase Service Role Key for database updates
- Stripe operations use your Stripe Secret Key
- Both keys should be kept secure and never exposed to the client

## Future Enhancements

- [ ] Add DELETE webhook to archive Stripe products when tours are deleted
- [ ] Support for multiple currencies
- [ ] Sync tour images to Stripe product images
- [ ] Handle Stripe webhook errors with retry logic










