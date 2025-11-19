-- Guides table to manage tour guides and availability
CREATE TABLE IF NOT EXISTS guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  cities text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  tour_types text[] NOT NULL DEFAULT '{}',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  availability text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_availability CHECK (availability IN ('available', 'limited', 'unavailable'))
);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides readable by authenticated"
  ON guides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Guides insert for authenticated"
  ON guides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Guides update for authenticated"
  ON guides FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Guides delete for authenticated"
  ON guides FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX guides_availability_idx ON guides (availability);



