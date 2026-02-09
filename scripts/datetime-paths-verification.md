# Datetime Paths Verification

## ✅ All Datetime Paths Verified

### 1. Forms → API Routes

#### B2B Form (`app/[locale]/b2b-offerte/page.tsx`)
- **Sends:** `dateTime: "2025-03-20T14:00"` (string, no timezone)
- **Receives:** `app/api/b2b-booking/create/route.ts`
- **Processing:** Uses `parseBrusselsDateTime()` to interpret as Brussels local time
- **Stores:** `toBrusselsLocalISO()` → `"2025-03-20T14:00:00"` (no offset)
- ✅ **Status:** CORRECT

#### Admin Booking Form (`app/[locale]/admin/bookings/page.tsx`)
- **Sends:** `date: "2025-03-20"`, `time: "14:00"` (separate fields)
- **Processing:** Uses `parseBrusselsDateTime(date, time)` then `toBrusselsLocalISO()`
- **Stores:** `"2025-03-20T14:00:00"` (no offset)
- ✅ **Status:** CORRECT

#### Tour Booking Dialog (`components/tours/tour-booking-dialog.tsx`)
- **Sends:** `bookingDate: "2025-03-20"`, `bookingTime: "14:00"`, `bookingDateTime: "2025-03-20T14:00"`
- **Receives:** `supabase/functions/create-checkout-session/index.ts`
- **Processing:** Uses `parseBrusselsDateTime()` then `toBrusselsLocalISO()`
- **Stores:** `"2025-03-20T14:00:00"` (no offset)
- ✅ **Status:** CORRECT

### 2. Stripe Checkout → Webhook → Database

#### Checkout Session (`supabase/functions/create-checkout-session/index.ts`)
- **Receives:** `bookingDate`, `bookingTime`, `bookingDateTime` from frontend
- **Processing:** Uses `parseBrusselsDateTime()` then `toBrusselsLocalISO()`
- **Passes to Stripe:** Datetime in metadata (for webhook)
- **Stores in bookingData:** `tourDatetime: "2025-03-20T14:00:00"` (no offset)
- ✅ **Status:** CORRECT

#### Stripe Webhook (`supabase/functions/stripe-webhook/index.ts`)
- **Receives:** `bookingData.tourDatetime` (already in correct format from checkout)
- **Processing:** Uses `toBrusselsLocalISO()` for Saturday date calculations
- **Stores:** `tour_datetime: "2025-03-20T14:00:00"` (no offset)
- ✅ **Status:** CORRECT

### 3. Webshop Items

#### Webshop Checkout (`supabase/functions/create-webshop-checkout/index.ts`)
- **Items:** Products (books, merchandise, games, gift cards)
- **Datetime:** ❌ **NOT APPLICABLE** - Webshop items do not use `tour_datetime`
- ✅ **Status:** N/A (no datetime handling needed)

### 4. Date Comparisons & Queries

#### Aftercare Functions
- `supabase/functions/aftercare-check/index.ts`: Uses `toBrusselsLocalISO()` for comparisons
- `supabase/functions/aftercare-start/index.ts`: Uses `toBrusselsLocalISO()` for comparisons
- ✅ **Status:** CORRECT

#### Drive Link Revocation
- `supabase/functions/revoke-expired-drive-links/index.ts`: Uses `toBrusselsLocalISO()` for comparisons
- ✅ **Status:** CORRECT

## Format Verification

All datetime values stored in database:
- ✅ Format: `YYYY-MM-DDTHH:mm:ss` (e.g., `"2025-03-20T14:00:00"`)
- ✅ No timezone offsets (`+01:00`, `+02:00`, `Z`)
- ✅ Represents Brussels local time
- ✅ Handles DST correctly (winter/summer)

## Files Updated

1. ✅ `app/api/b2b-booking/create/route.ts` - Fixed to use `parseBrusselsDateTime()`
2. ✅ `app/api/check-tanguy-availability/route.ts` - Uses `toBrusselsLocalISO()`
3. ✅ `app/[locale]/admin/bookings/page.tsx` - Uses `toBrusselsLocalISO()`
4. ✅ `app/[locale]/admin/bookings/[bookingId]/page.tsx` - Uses `toBrusselsLocalISO()`
5. ✅ `supabase/functions/create-checkout-session/index.ts` - Uses `toBrusselsLocalISO()`
6. ✅ `supabase/functions/stripe-webhook/index.ts` - Uses `toBrusselsLocalISO()`
7. ✅ `supabase/functions/aftercare-check/index.ts` - Uses `toBrusselsLocalISO()`
8. ✅ `supabase/functions/aftercare-start/index.ts` - Uses `toBrusselsLocalISO()`
9. ✅ `supabase/functions/revoke-expired-drive-links/index.ts` - Uses `toBrusselsLocalISO()`

## Summary

✅ **All forms** pass dates correctly  
✅ **All API routes** convert dates using `toBrusselsLocalISO()`  
✅ **All Stripe-related** dates use correct format  
✅ **Webshop items** do not require datetime handling  
✅ **All database inserts** use dates without timezone offset  

**All datetime paths are verified and working correctly!**

