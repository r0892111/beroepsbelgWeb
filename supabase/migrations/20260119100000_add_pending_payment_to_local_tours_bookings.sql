-- Add pending payment tracking and payment history columns to local_tours_bookings
ALTER TABLE local_tours_bookings
ADD COLUMN IF NOT EXISTS pending_payment_people INTEGER,
ADD COLUMN IF NOT EXISTS pending_payment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS extra_payments_received JSONB DEFAULT '[]'::jsonb;
