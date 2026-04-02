-- Add medium_url column to profiles table
-- Same type and pattern as twitter_url and linkedin_url
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medium_url TEXT DEFAULT NULL;
