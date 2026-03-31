-- Add research_preview JSONB column for sign-in gate preview data
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE articles ADD COLUMN IF NOT EXISTS research_preview JSONB DEFAULT NULL;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'articles' AND column_name = 'research_preview';
