# TourBooking Status Mapping

This document maps where the `tourbooking.status` field is changed and what causes each status change.

## Status Values

The following status values are used in the booking lifecycle:

- `pending` - Initial status when booking is created (B2C bookings)
- `payment_completed` - Payment has been successfully processed (B2C bookings after payment)
- `pending_guide_confirmation` - Initial status for B2B bookings (set via n8n webhook)
- `confirmed` - Guide has accepted the booking (uniform across all flows)
- `completed` - Tour has been completed (photos uploaded, tour finished)
- `cancelled` - Booking has been cancelled (listed in admin filters but no update code found)

**Important:** When a guide declines a booking, the status remains unchanged:
- B2C bookings: stays at `payment_completed`
- B2B bookings: stays at `pending_guide_confirmation`

This allows another guide to accept the booking offer regardless of booking type.

## Status Change Locations

### 1. Initial Booking Creation → `pending`

**Location:** `supabase/functions/create-checkout-session/index.ts`

**Line:** 323

**Trigger:** When a customer creates a booking through the checkout flow

**Code:**
```typescript
const bookingData: any = {
  tour_id: tourId,
  stripe_session_id: session.id,
  status: 'pending',  // ← Set here
  tour_datetime: tourDatetime,
  // ... other fields
};
```

**What causes it:**
- Customer completes checkout form
- Stripe checkout session is created
- Booking record is inserted into `tourbooking` table with `status: 'pending'`

---

### 2. Payment Success → `payment_completed`

**Location:** `supabase/functions/stripe-webhook/index.ts`

**Line:** 75

**Trigger:** Stripe webhook event `checkout.session.completed` with `payment_status: 'paid'`

**Code:**
```typescript
if (mode === 'payment' && payment_status === 'paid') {
  // First, try to update a tour booking
  const { data: tourBooking, error: tourBookingError } = await supabase
    .from('tourbooking')
    .update({ status: 'payment_completed' })  // ← Updated here
    .eq('stripe_session_id', sessionId)
    .select()
    .single();
}
```

**What causes it:**
- Customer completes Stripe payment
- Stripe sends `checkout.session.completed` webhook
- Webhook handler updates booking status to `payment_completed`
- Also triggers n8n webhook for tour booking confirmation

**Flow:**
1. Customer pays via Stripe checkout
2. Stripe webhook fires → `stripe-webhook` function
3. Status updated from `pending` → `payment_completed`
4. N8N webhook triggered for downstream processing

---

### 3. Guide Accepts → `confirmed`

**Location:** `app/api/confirm-guide/[dealId]/confirm/route.ts`

**Line:** 117-121

**Trigger:** Guide clicks accept button on confirmation page

**Code:**
```typescript
// Update booking status only when guide accepts
// When guide declines, status remains unchanged (payment_completed for B2C, pending_guide_confirmation for B2B)
// This allows another guide to accept the booking offer
if (action === 'accept') {
  const { error: updateError } = await supabase
    .from('tourbooking')
    .update({ status: 'confirmed' })  // ← Updated here
    .eq('deal_id', uuid);
}
```

**What causes it:**
- Guide receives confirmation link with `dealId`
- Guide clicks "Accept" button
- POST request to `/api/confirm-guide/[dealId]/confirm`
- Status updated to `confirmed` (works for both B2C and B2B bookings)
- Also triggers n8n webhook

**Flow:**
1. Guide receives deal confirmation link
2. Guide accepts → POST to API endpoint
3. Status updated to `confirmed` (from `payment_completed` for B2C, or `pending_guide_confirmation` for B2B)
4. N8N webhook triggered

---

### 4. Guide Declines → Status Remains Unchanged

**Location:** `app/api/confirm-guide/[dealId]/confirm/route.ts`

**Line:** 117-128

**Trigger:** Guide clicks decline button on confirmation page

**Code:**
```typescript
// Update booking status only when guide accepts
// When guide declines, status remains unchanged (payment_completed for B2C, pending_guide_confirmation for B2B)
// This allows another guide to accept the booking offer
if (action === 'accept') {
  // ... update to 'confirmed'
}
// If declined, don't update status - keep current status
```

**What causes it:**
- Guide receives confirmation link with `dealId`
- Guide clicks "Decline" button
- POST request to `/api/confirm-guide/[dealId]/confirm`
- **Status is NOT updated** - remains unchanged:
  - B2C bookings: stays at `payment_completed`
  - B2B bookings: stays at `pending_guide_confirmation`
- N8N webhook is still triggered (for notification purposes)
- Another guide can still accept the booking offer

**Why:** This design allows multiple guides to be offered the same booking. If one declines, the status stays unchanged so another guide can accept it. This works uniformly for both B2C and B2B bookings.

---

### 5. Tour Completion → `completed`

**Location:** `app/api/complete-tour/[tourId]/complete/route.ts`

**Line:** 87-93

**Trigger:** Guide marks tour as completed (after uploading photos)

**Code:**
```typescript
// Check if pictures have been uploaded before allowing completion
if (!booking.picturesUploaded) {
  return NextResponse.json(
    { error: 'Please upload tour photos before completing the tour' },
    { status: 400 }
  );
}

// Update booking status to completed
const { error: updateError } = await supabase
  .from('tourbooking')
  .update({ 
    status: 'completed',  // ← Updated here
    picturesUploaded: true // Also mark that photos are uploaded/finalized
  })
  .eq('id', bookingIdNum);
```

**What causes it:**
- Guide uploads tour photos via `/api/upload-tour-photos` (sets `picturesUploaded: true`)
- Guide clicks "Complete Tour" button
- POST request to `/api/complete-tour/[tourId]/complete`
- **Validates that photos have been uploaded** (`picturesUploaded` must be `true`)
- Status updated to `completed` (if not already completed)
- Triggers n8n webhook

**Requirements:**
- Photos must be uploaded first (`picturesUploaded: true`)
- Status must not already be `completed`

**Flow:**
1. Guide uploads photos via `/complete-tour/[tourId]` page → sets `picturesUploaded: true`
2. Guide clicks "Complete Tour"
3. POST to `/api/complete-tour/[tourId]/complete`
4. System validates `picturesUploaded === true`
5. Status updated from `confirmed` → `completed`
6. N8N webhook triggered

**Note:** This endpoint checks if status is already `completed` and prevents duplicate updates. It also requires photos to be uploaded before allowing completion.

---

### 6. B2B Booking Creation → `pending_guide_confirmation`

**Location:** `app/[locale]/b2b-offerte/page.tsx`

**Line:** 292

**Trigger:** When a B2B booking form is submitted

**Code:**
```typescript
const payload = {
  // ... other fields
  status: 'pending_guide_confirmation',  // ← Set here
};
```

**What causes it:**
- B2B offer form submission
- Data is sent to n8n webhook
- Note: This appears to be sent to webhook, not directly updating database. The actual database update may happen via n8n workflow.

---

## Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Booking Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

B2C Booking Flow:
  Create Booking → 'pending'
       ↓
  Payment Success → 'payment_completed'
       ↓
  Guide Accepts → 'confirmed'
       ↓
  Guide Completes Tour → 'completed'

B2C Alternative Flow (Guide Decline):
  Create Booking → 'pending'
       ↓
  Payment Success → 'payment_completed'
       ↓
  Guide Declines → 'payment_completed' (status unchanged)
       ↓
  Another Guide Can Accept → 'confirmed'
       ↓
  Guide Completes Tour → 'completed'

B2B Booking Flow:
  Create Booking → 'pending_guide_confirmation' (via n8n webhook)
       ↓
  Guide Accepts → 'confirmed'
       ↓
  Guide Completes Tour → 'completed'

B2B Alternative Flow (Guide Decline):
  Create Booking → 'pending_guide_confirmation' (via n8n webhook)
       ↓
  Guide Declines → 'pending_guide_confirmation' (status unchanged)
       ↓
  Another Guide Can Accept → 'confirmed'
       ↓
  Guide Completes Tour → 'completed'

UNIFORM BEHAVIOR:
- All bookings end at 'confirmed' when guide accepts
- All bookings stay at current status when guide declines
- All bookings end at 'completed' when tour is finished
```

## Key Files Reference

1. **Booking Creation:**
   - `supabase/functions/create-checkout-session/index.ts` - Sets `status: 'pending'`

2. **Payment Processing:**
   - `supabase/functions/stripe-webhook/index.ts` - Updates to `status: 'payment_completed'` on payment

3. **Guide Confirmation:**
   - `app/api/confirm-guide/[dealId]/confirm/route.ts` - Updates to `confirmed` when guide accepts, leaves as `payment_completed` when guide declines

4. **Tour Completion:**
   - `app/api/complete-tour/[tourId]/complete/route.ts` - Updates to `completed` (requires photos uploaded)
   - `app/api/upload-tour-photos/route.ts` - Sets `picturesUploaded: true` when photos are uploaded

5. **Aftercare Processing:**
   - `supabase/functions/aftercare-check/index.ts` - Cron job that sends aftercare webhooks when tours end (does NOT update status)

6. **B2B Bookings:**
   - `app/[locale]/b2b-offerte/page.tsx` - Sends `pending_guide_confirmation` to webhook

7. **Status Display:**
   - `app/[locale]/admin/bookings/page.tsx` - Shows status filter options: `['pending', 'payment_completed', 'pending_guide_confirmation', 'confirmed', 'completed', 'cancelled']`
   - `app/[locale]/account/page.tsx` - Displays booking status badges with appropriate colors for all statuses

## Notes

- The `status` field is a `text` type in the database (no enum constraint found)
- Status can be checked/read in multiple places but only updated in the locations listed above
- **Uniform behavior:** When a guide declines, the status remains unchanged:
  - B2C bookings: stays at `payment_completed`
  - B2B bookings: stays at `pending_guide_confirmation`
- When a guide accepts, status is updated to `confirmed` for both B2C and B2B bookings
- The `completed` status is only set when:
  - Guide manually completes the tour via the complete endpoint
  - Photos have been uploaded (`picturesUploaded: true`)
- The aftercare cron job does NOT update status - it only sends aftercare webhooks
- There's no explicit `cancelled` status update found in the codebase, but it's listed as a filter option in admin
- B2B bookings are created via n8n webhook with `pending_guide_confirmation` status
- Admin page (`app/[locale]/admin/bookings/page.tsx`) only displays status - no manual editing capability
- No database triggers found that automatically update status - all changes are application-driven

## Summary

**Total locations where status is changed: 4**

1. ✅ **Booking Creation** → `pending` (create-checkout-session)
2. ✅ **Payment Success** → `payment_completed` (stripe-webhook)
3. ✅ **Guide Accepts** → `confirmed` (confirm-guide API)
4. ✅ **Tour Completion** → `completed` (complete-tour API - requires photos uploaded)

**Separate Actions (do NOT change status):**
- **Aftercare Check** (cron job) - Only sends aftercare webhooks when tours end, does NOT update status
- **Photo Upload** - Sets `picturesUploaded: true` flag, does NOT update status

**Important Behavior:**
- When guide declines → Status remains `payment_completed` (no change)
- This allows multiple guides to be offered the same booking sequentially

**B2B Bookings:**
- Status `pending_guide_confirmation` is sent to n8n webhook but actual database update may happen externally via n8n workflow
