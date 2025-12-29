/*
  # Setup Saturday Bookings for All Local Stories Tours

  This migration creates 4 Saturday bookings for all tours that have local_stories = true.
  These bookings will be created in the local_tours_bookings table with:
  - booking_date: Next 4 Saturdays
  - booking_time: 14:00:00
  - status: 'available' (can be booked)
  - is_booked: false

  The migration is idempotent - it will only create bookings that don't already exist.
*/

-- Function to get the next N Saturdays starting from the next Saturday
CREATE OR REPLACE FUNCTION get_next_saturdays(count_saturdays integer DEFAULT 4)
RETURNS TABLE(saturday_date date) AS $$
DECLARE
  today date := CURRENT_DATE;
  days_until_saturday integer;
  next_saturday date;
  i integer;
BEGIN
  -- Find the next Saturday
  days_until_saturday := (6 - EXTRACT(DOW FROM today)::integer + 7) % 7;
  IF days_until_saturday = 0 THEN
    days_until_saturday := 7; -- If today is Saturday, get next Saturday
  END IF;
  
  next_saturday := today + (days_until_saturday || ' days')::interval;
  
  -- Generate the next N Saturdays
  FOR i IN 0..(count_saturdays - 1) LOOP
    saturday_date := next_saturday + (i * 7 || ' days')::interval;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create Saturday bookings for all local stories tours
DO $$
DECLARE
  tour_record RECORD;
  saturday_record RECORD;
  booking_exists boolean;
  created_count integer := 0;
BEGIN
  -- Loop through all tours with local_stories = true
  FOR tour_record IN 
    SELECT id, title, city 
    FROM tours_table_prod 
    WHERE local_stories = true 
       OR local_stories = 'true' 
       OR local_stories = 1
  LOOP
    RAISE NOTICE 'Processing local stories tour: % (ID: %)', tour_record.title, tour_record.id;
    
    -- Loop through the next 4 Saturdays
    FOR saturday_record IN 
      SELECT saturday_date FROM get_next_saturdays(4)
    LOOP
      -- Check if booking already exists for this tour and date
      SELECT EXISTS(
        SELECT 1 
        FROM local_tours_bookings 
        WHERE tour_id = tour_record.id 
          AND booking_date = saturday_record.saturday_date
      ) INTO booking_exists;
      
      -- Create booking if it doesn't exist
      IF NOT booking_exists THEN
        INSERT INTO local_tours_bookings (
          tour_id,
          booking_date,
          booking_time,
          is_booked,
          status,
          customer_name,
          customer_email,
          customer_phone,
          stripe_session_id
        ) VALUES (
          tour_record.id,
          saturday_record.saturday_date,
          '14:00:00',
          false,
          'available',
          NULL,
          NULL,
          NULL,
          NULL
        );
        
        created_count := created_count + 1;
        RAISE NOTICE 'Created booking for tour % on %', tour_record.title, saturday_record.saturday_date;
      ELSE
        RAISE NOTICE 'Booking already exists for tour % on %', tour_record.title, saturday_record.saturday_date;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Created % new Saturday bookings for local stories tours.', created_count;
END $$;

-- Clean up the helper function (optional - you can keep it if you want to reuse it)
-- DROP FUNCTION IF EXISTS get_next_saturdays(integer);

-- Add comment
COMMENT ON FUNCTION get_next_saturdays(integer) IS 
  'Returns the next N Saturdays starting from the next Saturday. Used for setting up local stories tour bookings.';

