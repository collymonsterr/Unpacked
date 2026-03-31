-- Session 1.7C: Add blueprint and editorial_score columns
-- Run this in Supabase SQL Editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS blueprint JSONB DEFAULT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS editorial_score INTEGER DEFAULT NULL;
