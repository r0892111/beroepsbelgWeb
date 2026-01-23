# How to Check Why Bookings Are Empty

## Possible Causes

1. **Webhook not receiving events from Stripe**
   - Check Stripe Dashboard → Webhooks → Check if events are being sent
   - Verify webhook endpoint URL is correct
   - Check if webhook secret is configured correctly

2. **Pending bookings exist but webhook isn't processing them**
   - Run the diagnostic SQL queries in `diagnose-empty-bookings.sql`
   - Check if there are expired pending bookings
   - Check Supabase function logs for errors

3. **Webhook processing but failing silently**
   - Check Supabase Edge Function logs for `stripe-webhook`
   - Look for error messages in the logs
   - Check if webhook is receiving `checkout.session.completed` events

## Steps to Diagnose

### Step 1: Check Database
Run the SQL queries in `diagnose-empty-bookings.sql` to see:
- How many pending bookings exist
- If any bookings have been processed
- If there are orphaned pending bookings

### Step 2: Check Stripe Webhook Configuration
1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint (should be something like `https://your-project.supabase.co/functions/v1/stripe-webhook`)
3. Check recent events:
   - Look for `checkout.session.completed` events
   - Check if they're successful (200 status) or failing
   - Check the event payload to see if `payment_status: 'paid'`

### Step 3: Check Supabase Function Logs
1. Go to Supabase Dashboard → Edge Functions → `stripe-webhook`
2. Check logs for:
   - Recent invocations
   - Error messages
   - Console logs showing booking processing

### Step 4: Test the Flow
1. Create a test booking
2. Complete payment in Stripe test mode
3. Check if:
   - `pending_tour_bookings` gets created (should happen immediately)
   - Webhook receives the event (check Stripe dashboard)
   - `tourbooking` gets created (should happen after webhook processes)
   - `local_tours_bookings` gets created (for local stories tours)

## Common Issues

### Issue: Webhook not configured
**Solution**: Set up webhook in Stripe Dashboard pointing to your Supabase function URL

### Issue: Webhook secret missing
**Solution**: Set `STRIPE_WEBHOOK_SECRET` environment variable in Supabase Edge Functions

### Issue: Pending bookings expired
**Solution**: Pending bookings expire after 2 hours. If payment takes longer, they won't be processed. Check if customers are completing payments.

### Issue: Webhook receiving events but not processing
**Solution**: Check function logs for errors. Common issues:
- Missing required fields in booking_data
- Database permission issues
- Invalid tour_id references

## Quick Fix: Reprocess Failed Bookings

If you find orphaned pending bookings with valid Stripe sessions:

```sql
-- Get pending bookings that should have been processed
SELECT 
  ptb.stripe_session_id,
  ptb.tour_type,
  ptb.booking_data
FROM pending_tour_bookings ptb
LEFT JOIN tourbooking tb ON tb.stripe_session_id = ptb.stripe_session_id
WHERE tb.id IS NULL
  AND ptb.expires_at > NOW() - INTERVAL '24 hours'  -- Only recent ones
ORDER BY ptb.created_at DESC;
```

Then manually trigger the webhook or reprocess these sessions.
