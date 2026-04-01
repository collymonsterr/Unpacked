-- Session 1.8B: Add triple fact-check audit trail and per-article cost tracking
-- Run this in Supabase SQL Editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS fact_check_audit JSONB DEFAULT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'articles' AND column_name IN ('fact_check_audit', 'total_cost');
