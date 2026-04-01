-- Add category as a top-level column on articles table
-- This enables efficient filtering and querying by category
-- Previously category only existed inside the plan JSONB field

ALTER TABLE articles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Backfill from existing plan JSONB data
UPDATE articles
SET category = plan->>'category'
WHERE plan->>'category' IS NOT NULL AND category IS NULL;

-- Optional: create index for category filtering
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
