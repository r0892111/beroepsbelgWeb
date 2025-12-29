/*
  # Create job_applications table

  1. Changes
    - Create job_applications table to store job application data
    - Add columns: id, name, email, phone, city, motivation, cv_url, photo_url, consent, created_at, updated_at
    - Enable RLS and create policies for admins to view and anyone to insert

  2. Notes
    - cv_url and photo_url store Supabase Storage URLs
    - consent is required (boolean, defaults to false)
    - created_at and updated_at are automatically managed
*/

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  motivation TEXT NOT NULL,
  cv_url TEXT,
  photo_url TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert job applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can view job applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can update job applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can delete job applications" ON job_applications;

-- Policy: Anyone can insert job applications
CREATE POLICY "Anyone can insert job applications"
  ON job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admins can view job applications
CREATE POLICY "Admins can view job applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Policy: Admins can update job applications
CREATE POLICY "Admins can update job applications"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Policy: Admins can delete job applications
CREATE POLICY "Admins can delete job applications"
  ON job_applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Add comment for documentation
COMMENT ON TABLE job_applications IS 'Stores job application submissions with CV and photo uploads';
COMMENT ON COLUMN job_applications.cv_url IS 'Supabase Storage URL for uploaded CV (PDF)';
COMMENT ON COLUMN job_applications.photo_url IS 'Supabase Storage URL for uploaded photo (image)';


