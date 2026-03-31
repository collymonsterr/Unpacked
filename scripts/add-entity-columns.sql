-- Session 1.7B: Add entity cards and research synthesis columns
-- Run this in Supabase SQL Editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS entity_cards JSONB DEFAULT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS research_synthesis JSONB DEFAULT NULL;
