/*
  # Drop Bookings Table

  This migration removes the old `bookings` table as the system now uses the existing `tourbooking` table.

  1. Changes
    - Drop all policies on bookings table
    - Drop all indexes on bookings table
    - Drop bookings table

  2. Notes
    - The system now uses the `tourbooking` table for managing tour bookings
    - All booking data should be migrated to `tourbooking` before running this migration if needed
*/

-- Drop policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can view bookings by session" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Anonymous users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Service role can update bookings" ON bookings;

-- Drop indexes
DROP INDEX IF EXISTS idx_bookings_user_id;
DROP INDEX IF EXISTS idx_bookings_tour_id;
DROP INDEX IF EXISTS idx_bookings_stripe_session_id;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_created_at;
DROP INDEX IF EXISTS idx_bookings_booking_date;

-- Drop table
DROP TABLE IF EXISTS bookings;
