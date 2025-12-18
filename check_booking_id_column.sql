-- Check if booking_id column exists in local_tours_bookings table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'local_tours_bookings' 
  AND column_name = 'booking_id';

-- If the above returns no rows, the column doesn't exist yet
-- Run the migration: 20250116000000_add_booking_id_to_local_tours_bookings.sql



