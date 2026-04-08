-- Add Twitter/X integration columns to articles table
-- Stores Twitter findings (tweets surfaced via Brave site:x.com search) and a Haiku-generated sentiment summary
-- Run this in the Supabase SQL Editor

ALTER TABLE articles
ADD COLUMN IF NOT EXISTS twitter_findings JSONB DEFAULT NULL;

ALTER TABLE articles
ADD COLUMN IF NOT EXISTS twitter_summary TEXT DEFAULT NULL;

COMMENT ON COLUMN articles.twitter_findings IS 'Tweet/X findings from Brave site:x.com search — array of { id, author_handle, snippet, url }';
COMMENT ON COLUMN articles.twitter_summary IS 'Haiku-generated one-paragraph sentiment summary of the X conversation';
