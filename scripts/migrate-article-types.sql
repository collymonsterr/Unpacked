-- Migration: Rename old article types inside the JSONB `article` column
-- tutorial → how_to
-- news → news_analysis
-- planning is kept as-is (deep_dive is a new type, not a rename of planning)
--
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times — the WHERE clause prevents double-updates.

-- 1. tutorial → how_to
UPDATE articles
SET article = jsonb_set(article, '{article_type}', '"how_to"')
WHERE article->>'article_type' = 'tutorial';

-- 2. news → news_analysis
UPDATE articles
SET article = jsonb_set(article, '{article_type}', '"news_analysis"')
WHERE article->>'article_type' = 'news';

-- Verify: show remaining old types (should return 0 rows for tutorial and news)
SELECT
  article->>'article_type' AS article_type,
  COUNT(*) AS count
FROM articles
WHERE article IS NOT NULL
GROUP BY article->>'article_type'
ORDER BY count DESC;
