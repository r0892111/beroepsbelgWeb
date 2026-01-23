-- Diagnostic queries to check why tourbooking and local_tours_bookings are empty

-- 1. Check if there are any pending bookings waiting to be processed
SELECT 
  COUNT(*) as pending_count,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending
FROM pending_tour_bookings;

-- 2. Check expired pending bookings (older than 2 hours)
SELECT 
  COUNT(*) as expired_count,
  tour_type,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired
FROM pending_tour_bookings
GROUP BY tour_type;

-- 3. Check if there are any tourbooking records at all
SELECT 
  COUNT(*) as total_tourbookings,
  COUNT(*) FILTER (WHERE status = 'payment_completed') as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
FROM tourbooking;

-- 4. Check if there are any local_tours_bookings records
SELECT 
  COUNT(*) as total_local_bookings,
  COUNT(*) FILTER (WHERE status = 'booked') as booked,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE is_booked = true) as is_booked_true
FROM local_tours_bookings;

-- 5. Check recent pending bookings with details
SELECT 
  id,
  stripe_session_id,
  tour_type,
  created_at,
  expires_at,
  expires_at < NOW() as is_expired,
  booking_data->>'customerEmail' as customer_email,
  booking_data->>'tourId' as tour_id
FROM pending_tour_bookings
ORDER BY created_at DESC
LIMIT 20;

-- 6. Check if webhook has processed any sessions (check for tourbookings with stripe_session_id)
SELECT 
  COUNT(DISTINCT stripe_session_id) as processed_sessions,
  MIN(created_at) as first_booking,
  MAX(created_at) as last_booking
FROM tourbooking
WHERE stripe_session_id IS NOT NULL;

-- 7. Check for orphaned pending bookings (pending bookings without corresponding tourbooking)
SELECT 
  ptb.id,
  ptb.stripe_session_id,
  ptb.tour_type,
  ptb.created_at,
  ptb.expires_at < NOW() as is_expired
FROM pending_tour_bookings ptb
LEFT JOIN tourbooking tb ON tb.stripe_session_id = ptb.stripe_session_id
WHERE tb.id IS NULL
ORDER BY ptb.created_at DESC
LIMIT 20;
