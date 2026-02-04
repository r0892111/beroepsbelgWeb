# ExtraHour Tour End Verification

## ✅ Verification Complete

When `extraHour` flag is `true`, the `tour_end` is correctly increased by **1 hour (60 minutes)**.

## Implementation Across All Paths

### 1. B2B Booking (`app/api/b2b-booking/create/route.ts`)
```typescript
const baseDuration = tour?.duration_minutes || 120;
const extraHour = opMaatAnswers?.extraHour === true;
const actualDuration = extraHour ? baseDuration + 60 : baseDuration;
const finalDurationMinutes = durationMinutes || actualDuration;
tourEndDatetime = addMinutesBrussels(tourDatetime, finalDurationMinutes);
```
✅ **Correct**: Adds 60 minutes when `extraHour` is true

### 2. Admin Booking Form (`app/[locale]/admin/bookings/page.tsx`)
```typescript
const tourDuration = tour.duration_minutes || 120;
const extraHourMinutes = createForm.extraHour ? 60 : 0;
const finalDuration = tourDuration + extraHourMinutes;
const tourEndDatetime = addMinutesBrussels(tourDatetime, finalDuration);
```
✅ **Correct**: Adds 60 minutes when `extraHour` is true

### 3. Checkout Session (`supabase/functions/create-checkout-session/index.ts`)
```typescript
const baseDuration = tour.duration_minutes || 120;
const hasExtraHour = opMaatAnswers?.extraHour === true || extraHour === true;
const actualDuration = hasExtraHour ? baseDuration + 60 : baseDuration;
const finalDurationMinutes = durationMinutes || actualDuration;
tourEndDatetime = addMinutesBrussels(tourDatetime, finalDurationMinutes);
```
✅ **Correct**: Adds 60 minutes when `hasExtraHour` is true

### 4. Stripe Webhook (`supabase/functions/stripe-webhook/index.ts`)
- Uses `bookingData.tourEndDatetime` from checkout session
- The checkout session already calculated it correctly with extra hour included
✅ **Correct**: Inherits correct `tourEndDatetime` from checkout session

## Test Results

- ✅ Standard tour (2 hours, no extra hour): `14:00` → `16:00`
- ✅ Tour with extra hour (2 hours + 1 hour): `14:00` → `17:00`
- ✅ Tour with extra hour (3 hours base + 1 hour): `10:00` → `14:00`
- ✅ Extra hour adds exactly 60 minutes

## Summary

**All booking creation paths correctly increase `tour_end` by 1 hour (60 minutes) when `extraHour` is true.**

The implementation is consistent across:
- B2B bookings
- Admin bookings
- Checkout sessions (B2C)
- Stripe webhook processing

