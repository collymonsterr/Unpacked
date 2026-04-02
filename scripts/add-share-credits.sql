-- Share credits log: tracks per-platform share credits earned
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS share_credits_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  article_id uuid NOT NULL,
  platform text NOT NULL,
  credited_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_id, platform)
);

-- Enable RLS
ALTER TABLE share_credits_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own share credits
CREATE POLICY "Users can read own share credits" ON share_credits_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own share credits
CREATE POLICY "Users can insert own share credits" ON share_credits_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
