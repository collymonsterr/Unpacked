-- Founding Creators programme: application tracking
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS founding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users UNIQUE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Enable RLS
ALTER TABLE founding_applications ENABLE ROW LEVEL SECURITY;

-- Users can read their own application
CREATE POLICY "Users can read own founding application" ON founding_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own application
CREATE POLICY "Users can insert own founding application" ON founding_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all (via service role key, bypasses RLS)
-- Admin updates also go through service role key
