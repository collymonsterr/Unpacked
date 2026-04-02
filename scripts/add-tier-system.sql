-- Tier system: add tier columns to profiles and create upgrade_waitlist table
-- Run this in Supabase SQL editor

-- Add tier columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_article_limit integer DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS articles_used_this_month integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS month_reset_date timestamptz DEFAULT (date_trunc('month', now()) + interval '1 month');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus_credits integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_creator boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz DEFAULT now();

-- Backfill existing profiles
UPDATE profiles SET
  tier = 'free',
  monthly_article_limit = 3,
  articles_used_this_month = 0,
  month_reset_date = date_trunc('month', now()) + interval '1 month',
  bonus_credits = 0,
  is_founding_creator = false,
  tier_updated_at = now()
WHERE tier IS NULL;

-- Create upgrade waitlist table
CREATE TABLE IF NOT EXISTS upgrade_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  requested_tier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on upgrade_waitlist
ALTER TABLE upgrade_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own waitlist entries
CREATE POLICY "Users can insert own waitlist entries" ON upgrade_waitlist
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own waitlist entries
CREATE POLICY "Users can read own waitlist entries" ON upgrade_waitlist
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
