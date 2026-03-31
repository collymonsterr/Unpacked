-- Add live_data column to articles table (Session 1.7E)
-- Stores live data results from Polymarket, Yahoo Finance, Google Trends
-- Run this in the Supabase SQL Editor

ALTER TABLE articles
ADD COLUMN IF NOT EXISTS live_data JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN articles.live_data IS 'Live data results from Polymarket, Yahoo Finance, Google Trends (Session 1.7E)';
