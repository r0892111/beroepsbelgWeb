# Tour Booking Refactor Plan

## Problem Summary

### Problem 1: Premature Database Records
Tour bookings are created in `create-checkout-session` BEFORE payment is completed. If a user cancels at Stripe checkout, the record remains in the database.

### Problem 2: EarlyDrop Shutdown for Local Stories Tours
Local stories tours cause "EarlyDrop" shutdowns during checkout. This is likely due to the complex database operations happening synchronously:
- Finding existing tourbooking for the Saturday
- Updating or creating tourbooking
- Updating invitees array
- Creating local_tours_bookings entry

Standard and custom (op maat) tours don't have this issue because they have simpler checkout logic.

---

## Current Tour Types & Their Specific Logic

### 1. Standard Tours (Regular B2C)
- Simple booking with date/time selection
- Creates single tourbooking record with one invitee
- No special lookup logic
- **Current flow**: Creates tourbooking → Stripe checkout → Webhook updates status

### 2. Custom Tours (Op Maat)
- No date/time required (determined later)
- Has `opMaatAnswers` object with user preferences (startEnd, cityPart, subjects, specialWishes)
- May have extra hour option (+150 EUR)
- **Current flow**: Creates tourbooking → Stripe checkout → Webhook updates status

### 3. Local Stories Tours
- Fixed Saturday dates at 14:00
- Multiple people can book the SAME tourbooking (shared tour)
- Complex logic to find existing tourbooking for that Saturday
- Creates separate `local_tours_bookings` entry linking to shared tourbooking
- Updates invitees array to append new person
- **Current flow**:
  1. Search for existing tourbooking by date
  2. If found: update stripe_session_id, append invitee
  3. If not found: create new tourbooking
  4. Create local_tours_bookings entry
  5. Stripe checkout
  6. Webhook updates status

### 4. B2B Quote Bookings
- Uses `quote_paid` status instead of `payment_completed`
- Has `booking_type: 'B2B'` field
- **Current flow**: Same as standard, different status handling in webhook

---

## Solution Architecture

### New Table: `pending_tour_bookings`

```sql
CREATE TABLE pending_tour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  booking_data jsonb NOT NULL,  -- All booking details
  tour_type text NOT NULL,      -- 'standard', 'op_maat', 'local_stories', 'b2b'
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '2 hours')
);

-- Index for cleanup
CREATE INDEX idx_pending_tour_bookings_expires ON pending_tour_bookings(expires_at);
```

### New Flow

#### Step 1: create-checkout-session (Simplified)
1. Validate tour exists and get price
2. Build line items (tour + upsells + extras)
3. Create Stripe checkout session
4. Store ALL booking data in `pending_tour_bookings` table
5. Return session URL to frontend
6. **NO tourbooking or local_tours_bookings records created yet**

#### Step 2: stripe-webhook (Enhanced)
When `checkout.session.completed` with `payment_status: 'paid'`:

1. Fetch pending booking data from `pending_tour_bookings` using `stripe_session_id`
2. Based on `tour_type`, execute appropriate logic:

   **For Standard Tours:**
   - Create tourbooking record with status `payment_completed`
   - Call N8N webhook

   **For Custom (Op Maat) Tours:**
   - Create tourbooking record with status `payment_completed`
   - Include opMaatAnswers in invitees
   - Call N8N webhook

   **For Local Stories Tours:**
   - Search for existing tourbooking for that Saturday
   - If found: append new invitee to existing tourbooking
   - If not found: create new tourbooking
   - Create local_tours_bookings entry with status `booked`
   - Call N8N webhook

   **For B2B Tours:**
   - Create tourbooking with status `quote_paid`
   - Call N8N webhook

3. Delete the pending booking record
4. Log success

#### Step 3: Cleanup (Optional Cron)
- Periodically delete expired pending bookings (older than 2 hours)
- Can be a Supabase scheduled function or manual cleanup

---

## Data to Store in pending_tour_bookings.booking_data

```json
{
  "tourId": "uuid",
  "tourTitle": "string",
  "tourPrice": 100,
  "isLocalStories": false,
  "isOpMaat": false,

  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string",
  "userId": "uuid or null",

  "bookingDate": "2025-01-15",
  "bookingTime": "14:00",
  "bookingDateTime": "2025-01-15T14:00:00",
  "tourDatetime": "ISO string (UTC)",
  "tourEndDatetime": "ISO string (UTC)",
  "durationMinutes": 120,

  "numberOfPeople": 2,
  "language": "nl",
  "specialRequests": "string",
  "requestTanguy": false,
  "extraHour": false,

  "citySlug": "antwerpen",

  "opMaatAnswers": {
    "startEnd": "string",
    "cityPart": "string",
    "subjects": "string",
    "specialWishes": "string",
    "extraHour": false
  },

  "upsellProducts": [
    {"n": "Product Name", "p": 25.00, "q": 1}
  ],

  "amounts": {
    "tourFullPrice": 200,
    "discountAmount": 20,
    "tourFinalAmount": 180,
    "tanguyCost": 0,
    "extraHourCost": 0
  },

  "locale": "nl"
}
```

---

## Implementation Steps

### Phase 1: Database Setup
1. Create `pending_tour_bookings` table with migration
2. Add RLS policies (service role only for insert/select/delete)

### Phase 2: Refactor create-checkout-session
1. Keep tour validation and line item building
2. Keep Stripe session creation
3. **REMOVE all tourbooking insert/update logic**
4. **REMOVE all local_tours_bookings insert logic**
5. **ADD** insert into pending_tour_bookings with full booking data
6. Determine tour_type based on tour.local_stories and opMaat flag

### Phase 3: Refactor stripe-webhook
1. Add handler for tour bookings (separate from webshop orders)
2. Fetch pending booking by stripe_session_id
3. Implement tour_type specific logic:
   - Standard: simple insert
   - Op Maat: simple insert with opMaatAnswers
   - Local Stories: find/create tourbooking, append invitee, create local_tours_bookings
   - B2B: insert with quote_paid status
4. Delete pending booking after success
5. Keep existing N8N webhook calls

### Phase 4: Testing Checklist
- [ ] Standard tour booking: new booking created after payment
- [ ] Standard tour cancel: no database records
- [ ] Op Maat tour booking: opMaatAnswers preserved
- [ ] Op Maat tour cancel: no database records
- [ ] Local Stories first booking: creates tourbooking + local_tours_bookings
- [ ] Local Stories second booking same Saturday: appends to existing tourbooking
- [ ] Local Stories cancel: no records created
- [ ] B2B booking: correct status applied
- [ ] Upsell products preserved correctly
- [ ] Tanguy button cost applied
- [ ] Extra hour applied
- [ ] N8N webhooks still fire correctly

### Phase 5: Cleanup
1. Add optional scheduled function to clean up expired pending bookings
2. Monitor for any edge cases

---

## Risk Mitigation

1. **Backup current functions** before modifying
2. **Test in staging** if available
3. **Keep old logic commented** temporarily for reference
4. **Add comprehensive logging** in webhook for debugging
5. **Handle webhook failures gracefully** - don't delete pending if booking creation fails

---

## Success Page Timing Issue

### Problem
With the new flow, there's a race condition:
1. User completes payment → immediately redirected to success page
2. Webhook is called asynchronously → creates booking in database

The success page might load BEFORE the webhook creates the booking.

### Solution: Polling with Pending Fallback
The success page will:
1. Try to fetch from `tourbooking` / `local_tours_bookings`
2. If not found, check `pending_tour_bookings` table
3. If pending found → show "Processing your payment..." with spinner
4. Poll every 2 seconds (max 30 seconds) until actual booking appears
5. Once booking found → display success as normal

### Implementation
- Add RLS policy allowing anon to SELECT from pending_tour_bookings by stripe_session_id
- Modify success page to handle the "pending" state with polling

---

## Files to Modify

1. `supabase/migrations/YYYYMMDD_create_pending_tour_bookings.sql` (NEW)
2. `supabase/functions/create-checkout-session/index.ts` (MAJOR REFACTOR)
3. `supabase/functions/stripe-webhook/index.ts` (ADD tour booking handler)
4. `app/[locale]/booking/success/page.tsx` (ADD polling for pending state)

---

## Metadata Strategy (Minimal)

Since all data is in pending_tour_bookings, Stripe metadata only needs:
```javascript
metadata: {
  booking_type: 'tour',  // To distinguish from webshop
  pending_booking_id: 'uuid',  // Reference to pending_tour_bookings
  // Keep some basic info for Stripe dashboard visibility
  customerName: 'string',
  customerEmail: 'string',
  tourId: 'uuid',
}
```

This avoids all character limit issues while keeping data visible in Stripe dashboard.
