# Manual Booking Creation Flow

## Overview
This document explains how admins manually create bookings through the admin panel (`/admin/bookings`).

## Step-by-Step Flow

### 1. **Admin Opens Create Booking Dialog**
- Admin clicks "Create Booking" button on the bookings page
- Dialog opens and automatically fetches TeamLeader deals (if available)
- Form is initialized with default values

### 2. **Form Fields**

The admin fills in the following fields:

**Required Fields:**
- **Tour**: Select from available tours (dropdown)
- **Date**: Booking date
- **Time**: Booking time (default: 14:00)
- **Customer Name**: Full name
- **Customer Email**: Email address

**Optional Fields:**
- **Customer Phone**: Phone number
- **Number of People**: Default 1
- **Language**: Default 'nl' (Dutch), can select 'other' and enter custom language
- **Special Requests**: Free text
- **Custom Price**: Override tour's default price per person
- **TeamLeader Deal**: Link to existing TeamLeader deal (dropdown)
- **Is Paid**: Checkbox to mark if customer already paid
- **Request Tanguy**: Add Tanguy fee (€125)
- **Extra Hour**: Add extra hour fee (€25)
- **Weekend Fee**: Add weekend fee (€25)
- **Evening Fee**: Add evening fee (€25)

### 3. **Duplicate Check**

Before creating, the system checks for duplicate bookings:
- Looks for existing bookings with the same `tour_id` and `tour_datetime` (same day)
- If duplicate found, shows warning dialog
- Admin can choose to:
  - Cancel and modify the booking
  - Proceed anyway (skip duplicate check)

### 4. **Price Calculation**

The system calculates the total amount:

```
Base Price = (customPrice OR tour.defaultPrice) × numberOfPeople
Total Amount = Base Price + Tanguy Fee + Extra Hour Fee + Weekend Fee + Evening Fee
```

**Fee Details:**
- Tanguy Fee: €125 (if `requestTanguy` is checked)
- Extra Hour Fee: €25 (if `extraHour` is checked)
- Weekend Fee: €25 (if `weekendFee` is checked AND it's a weekend)
- Evening Fee: €25 (if `eveningFee` is checked AND it's an evening slot)

### 5. **Deal ID Verification**

If a TeamLeader deal is selected:
1. System fetches all deals from TeamLeader API (`/api/admin/teamleader-deals`)
2. Verifies the selected `dealId` exists in TeamLeader
3. If deal doesn't exist:
   - Shows warning toast
   - Creates booking WITHOUT `deal_id`
4. If deal exists OR verification fails (API error):
   - Assigns `deal_id` to the booking

**Important:** The `deal_id` is only assigned if:
- A deal is selected from the dropdown
- The tour is NOT a Local Stories tour (for Local Stories, deal_id goes in `local_tours_bookings` instead)

### 6. **Invitee Object Creation**

Creates an invitee object with:
```javascript
{
  name: customerName,
  email: customerEmail,
  phone: customerPhone,
  numberOfPeople: numberOfPeople,
  language: finalLanguage,
  specialRequests: specialRequests,
  currency: 'eur',
  isContacted: false,
  isPaid: isPaid,
  pricePerPerson: calculatedPricePerPerson,
  // Fee information
  requestTanguy: requestTanguy,
  hasExtraHour: extraHour,
  weekendFee: weekendFee,
  eveningFee: eveningFee,
  tanguyCost: feeTanguyCost,
  extraHourCost: feeExtraHourCost,
  weekendFeeCost: feeWeekendCost,
  eveningFeeCost: feeEveningCost,
  // Only if isPaid = true:
  amount: totalAmount
}
```

### 7. **Booking Creation**

**For Regular Tours (not Local Stories):**
- Creates entry in `tourbooking` table with:
  - `tour_id`: Selected tour
  - `tour_datetime`: Combined date + time
  - `city`: From tour data
  - `status`: `'payment_completed'` if paid, `'pending'` if not paid
  - `invitees`: Array with single invitee object
  - `booking_type`: `'B2C'`
  - `deal_id`: TeamLeader deal ID (if selected and verified)

**For Local Stories Tours:**
- Creates entry in `tourbooking` table (shared booking for the Saturday)
- ALSO creates entry in `local_tours_bookings` table with:
  - `tour_id`: Selected tour
  - `booking_date`: Date
  - `booking_time`: Time
  - `customer_name`, `customer_email`, `customer_phone`
  - `booking_id`: Reference to main tourbooking
  - `deal_id`: TeamLeader deal ID (if selected) - stored per invitee

### 8. **Post-Creation**

After successful creation:
- Shows success toast
- Closes dialog
- Refreshes bookings list
- Resets form to defaults

## Important Notes

### Deal ID Handling
- **Verification**: System verifies deal exists in TeamLeader before assigning
- **Fallback**: If verification fails (API error), still assigns deal_id (assumes temporary issue)
- **Warning**: If deal doesn't exist, shows warning but still creates booking
- **Local Stories**: Deal ID stored in `local_tours_bookings` table, not `tourbooking` table

### Payment Status
- **If `isPaid = true`**:
  - Status: `'payment_completed'`
  - Invitee `amount` field is set to total amount
- **If `isPaid = false`**:
  - Status: `'pending'`
  - Invitee `amount` field is NOT set

### Custom Price
- If custom price is provided, it overrides the tour's default price
- Used to calculate `pricePerPerson` for the invitee
- Stored in `invitee.pricePerPerson` for reference

### Fees
- All fees are optional and can be manually set by admin
- Fees are stored in the invitee object for reference
- Total amount includes all fees

## Database Tables Affected

1. **`tourbooking`** table:
   - Main booking record
   - Contains `deal_id` (for non-Local Stories tours)
   - Contains `invitees` array with customer details

2. **`local_tours_bookings`** table (only for Local Stories):
   - Per-customer booking record
   - Contains `deal_id` (per invitee)
   - Links to main `tourbooking` via `booking_id`

## API Endpoints Used

1. **`GET /api/admin/teamleader-deals`**
   - Fetches list of open deals from TeamLeader
   - Used to populate deal dropdown
   - Used to verify deal exists before assignment

2. **Supabase Client** (direct database access)
   - `supabase.from('tourbooking').insert()`
   - `supabase.from('local_tours_bookings').insert()`

## Error Handling

- **Duplicate Booking**: Shows warning dialog, admin can proceed or cancel
- **Deal Not Found**: Shows warning toast, creates booking without deal_id
- **API Errors**: Logs error, shows error toast, doesn't create booking
- **Database Errors**: Logs error, shows error toast, doesn't create booking

## Next Steps After Creation

1. **If not paid**: Booking is created with status `'pending'`
2. **If paid**: Booking is ready for guide assignment
3. **Guide Assignment**: Admin can navigate to `/choose-guide/[bookingId]` to assign a guide
4. **Deal ID**: Used when guide accepts/declines (via `/api/confirm-guide/[dealId]/confirm`)
