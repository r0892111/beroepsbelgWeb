# Quote Status Flow for B2B Bookings

## Overview

B2B quote offers now have a separate status flow that allows for payment tracking via database webhooks.

## Status Flow

### B2B Quote Status Flow:
```
quote_pending → quote_sent → quote_accepted → quote_paid → confirmed → completed
```

### Status Definitions:

1. **`quote_pending`** - Initial status when quote request is created
   - Set when: B2B booking form is submitted
   - Location: `app/api/b2b-booking/create/route.ts`

2. **`quote_sent`** - Quote has been sent to customer
   - Set when: Quote is sent via email/n8n workflow
   - Location: External (n8n workflow)

3. **`quote_accepted`** - Customer has accepted the quote
   - Set when: Customer accepts quote (via n8n workflow)
   - Location: External (n8n workflow)

4. **`quote_paid`** - Payment has been received for the quote
   - Set when: Stripe payment webhook confirms payment for B2B booking
   - Location: `supabase/functions/stripe-webhook/index.ts`

5. **`confirmed`** - Guide has accepted the booking
   - Set when: Guide accepts the booking
   - Location: `app/api/confirm-guide/[dealId]/confirm/route.ts`

6. **`completed`** - Tour has been completed
   - Set when: Guide completes the tour
   - Location: `app/api/complete-tour/[tourId]/complete/route.ts`

## Database Webhook Setup

### Option 1: Supabase Dashboard Webhook (Recommended)

1. Go to **Supabase Dashboard** → **Database** → **Webhooks**
2. Click **Create a new hook**
3. Configure:
   - **Name**: `Quote Payment Check`
   - **Table**: `tourbooking`
   - **Events**: ✅ **Update**
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: Your webhook endpoint (e.g., n8n webhook URL)
   - **Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **Filter**: 
     ```sql
     booking_type = 'B2B' AND 
     status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid')
     ```

### Option 2: PostgreSQL Trigger (Already Set Up)

The migration `20250120000000_add_quote_status_flow.sql` creates:
- A trigger function `notify_quote_status_change()` that fires on status updates
- A trigger `quote_status_change_trigger` on the `tourbooking` table
- Uses `pg_notify` to send notifications that can be picked up by Supabase webhooks

### Monitoring Quote Payments

Use the view `quote_bookings_for_payment_check` to monitor quote bookings:

```sql
SELECT * FROM quote_bookings_for_payment_check
WHERE needs_payment_verification = true;
```

This view shows all B2B bookings with quote statuses and indicates which ones need payment verification.

## Payment Processing

When a payment is received for a B2B quote booking:

1. Stripe webhook fires (`checkout.session.completed`)
2. `stripe-webhook` function checks if booking is B2B type
3. If B2B, status is updated to `quote_paid` (instead of `payment_completed`)
4. Database webhook triggers (if configured)
5. Your external webhook (n8n) can check payment status

## Key Differences from B2C Flow

| Aspect | B2C Flow | B2B Quote Flow |
|--------|----------|----------------|
| Initial Status | `pending` | `quote_pending` |
| After Payment | `payment_completed` | `quote_paid` |
| Status Tracking | Simple flow | Multi-step quote flow |
| Payment Check | Direct | Via database webhook |

## Files Modified

1. **`app/api/b2b-booking/create/route.ts`**
   - Changed initial status from `pending_guide_confirmation` to `quote_pending`

2. **`app/[locale]/b2b-offerte/page.tsx`**
   - Updated webhook payload status to `quote_pending`

3. **`supabase/functions/stripe-webhook/index.ts`**
   - Added logic to set `quote_paid` status for B2B bookings instead of `payment_completed`

4. **`supabase/migrations/20250120000000_add_quote_status_flow.sql`**
   - Created trigger function and trigger for status change notifications

5. **`supabase/migrations/20250120000001_setup_quote_payment_webhook.sql`**
   - Created view for monitoring quote payments

## Testing

1. Create a B2B booking via `/b2b-offerte`
2. Check database: status should be `quote_pending`
3. Simulate quote acceptance: Update status to `quote_accepted` (via SQL or admin)
4. Process payment: Stripe webhook should set status to `quote_paid`
5. Verify database webhook fires (check webhook logs in Supabase Dashboard)

