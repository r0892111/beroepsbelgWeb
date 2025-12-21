-- Update booking ID 124 to trigger aftercare check
-- Set tour_datetime to a past date so the tour has finished
-- The tour_datetime + duration_minutes should be < now()

UPDATE tourbooking
SET 
  tour_datetime = NOW() - INTERVAL '3 hours' -- Set to 3 hours ago so tour has definitely finished
WHERE id = 124;

-- Verify the update
SELECT 
  id,
  tour_datetime,
  status,
  "isCustomerDetailsRequested",
  city,
  tour_id
FROM tourbooking
WHERE id = 124;

