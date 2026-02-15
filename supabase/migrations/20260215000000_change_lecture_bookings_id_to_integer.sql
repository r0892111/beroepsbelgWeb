/*
  # Change lecture_bookings.id to integer and use shared sequence with tourbooking

  1. Changes
    - Change lecture_bookings.id from UUID to integer
    - Use the same sequence as tourbooking for consistent ID numbering
    - Migrate existing data (if any)

  2. Notes
    - Lecture bookings will now have numeric IDs like tourbookings
    - IDs will be sequential and shared with tourbookings
    - This allows for unified booking ID management
*/

-- Step 1: Ensure tourbooking has a sequence, create one if it doesn't exist
DO $$
DECLARE
  tourbooking_seq_name TEXT;
  max_tourbooking_id INTEGER;
BEGIN
  -- Get the sequence name for tourbooking.id
  SELECT pg_get_serial_sequence('tourbooking', 'id') INTO tourbooking_seq_name;
  
  -- If tourbooking doesn't have a sequence, create one
  IF tourbooking_seq_name IS NULL THEN
    -- Get max ID from tourbooking to set sequence start
    SELECT COALESCE(MAX(id), 0) INTO max_tourbooking_id FROM tourbooking;
    
    -- Create sequence for tourbooking
    CREATE SEQUENCE IF NOT EXISTS tourbooking_id_seq;
    ALTER SEQUENCE tourbooking_id_seq OWNED BY tourbooking.id;
    ALTER TABLE tourbooking ALTER COLUMN id SET DEFAULT nextval('tourbooking_id_seq');
    PERFORM setval('tourbooking_id_seq', GREATEST(max_tourbooking_id, 1));
    
    tourbooking_seq_name := 'tourbooking_id_seq';
  ELSE
    -- Get max ID to ensure sequence is set correctly
    SELECT COALESCE(MAX(id), 0) INTO max_tourbooking_id FROM tourbooking;
    PERFORM setval(tourbooking_seq_name, GREATEST(max_tourbooking_id, 1));
  END IF;
END $$;

-- Step 2: Create a temporary table to store existing lecture_bookings data
CREATE TABLE IF NOT EXISTS lecture_bookings_temp AS 
SELECT * FROM lecture_bookings WHERE 1=0;

-- Step 3: Copy existing data to temp table (if any exists)
INSERT INTO lecture_bookings_temp 
SELECT * FROM lecture_bookings;

-- Step 4: Drop the original table
DROP TABLE IF EXISTS lecture_bookings CASCADE;

-- Step 5: Recreate lecture_bookings with integer ID using shared sequence
CREATE TABLE lecture_bookings (
  id integer PRIMARY KEY DEFAULT nextval('tourbooking_id_seq'),
  lecture_id uuid REFERENCES lectures(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  preferred_date date,
  number_of_people integer,
  location_description text,
  needs_room_provided boolean DEFAULT false,
  lecture_language text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure at least one of phone or email is provided
  CONSTRAINT check_contact_info CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Step 6: Restore data from temp table with new integer IDs
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM lecture_bookings_temp ORDER BY created_at LOOP
    INSERT INTO lecture_bookings (
      lecture_id, name, phone, email, preferred_date, 
      number_of_people, location_description, needs_room_provided, 
      lecture_language, status, created_at, updated_at
    ) VALUES (
      rec.lecture_id, rec.name, rec.phone, rec.email, rec.preferred_date,
      rec.number_of_people, rec.location_description, rec.needs_room_provided,
      rec.lecture_language, rec.status, rec.created_at, rec.updated_at
    );
  END LOOP;
END $$;

-- Step 7: Drop temp table
DROP TABLE IF EXISTS lecture_bookings_temp;

-- Step 8: Re-enable RLS
ALTER TABLE lecture_bookings ENABLE ROW LEVEL SECURITY;

-- Step 9: Recreate RLS policies
DROP POLICY IF EXISTS "Anyone can submit lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can view lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can update lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can delete lecture bookings" ON lecture_bookings;

CREATE POLICY "Anyone can submit lecture bookings"
  ON lecture_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view lecture bookings"
  ON lecture_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles.is_admin = true)
    )
  );

CREATE POLICY "Admins can update lecture bookings"
  ON lecture_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles.is_admin = true)
    )
  );

CREATE POLICY "Admins can delete lecture bookings"
  ON lecture_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles.is_admin = true)
    )
  );

-- Step 10: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_lecture_id ON lecture_bookings(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_status ON lecture_bookings(status);
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_created_at ON lecture_bookings(created_at DESC);

-- Step 11: Add comments
COMMENT ON TABLE lecture_bookings IS 'Stores lecture booking form submissions from the public lecture page';
COMMENT ON COLUMN lecture_bookings.id IS 'Integer ID shared with tourbooking table for unified booking ID management';
COMMENT ON COLUMN lecture_bookings.lecture_id IS 'Optional reference to specific lecture (nullable for general inquiries)';
COMMENT ON COLUMN lecture_bookings.needs_room_provided IS 'Whether the requester needs BeroepsBelg to provide a room/auditorium';
COMMENT ON COLUMN lecture_bookings.status IS 'Booking status: pending, confirmed, or cancelled';
