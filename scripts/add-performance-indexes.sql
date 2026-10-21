-- Indexes for the listing queries, added after the 14-15 Oct 2026 outages.
-- Run in the Supabase SQL editor. CONCURRENTLY so it does not lock the table —
-- run each statement on its own (CONCURRENTLY cannot run inside a transaction).
--
-- Every listing page filters on status + visibility and sorts by created_at.
-- Before this, each of those was a sequential scan over a table whose rows carry
-- several large JSONB columns, so even ~330 rows meant reading a lot of heap.

-- Homepage: status + visibility + hidden_from_homepage, newest first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_homepage
  ON articles (created_at DESC)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published'
    AND hidden_from_homepage = false;

-- Category pages: same filter plus category.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_category_listing
  ON articles (category, created_at DESC)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Category "popular" and "verified" sorts.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_category_popular
  ON articles (category, view_count DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_category_verified
  ON articles (category, verified_at DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Sitemap and internal links.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_published_views
  ON articles (view_count DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Admin/homepage flag lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_featured
  ON articles (created_at DESC) WHERE is_featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_trending
  ON articles (trending_set_at DESC) WHERE is_trending = true;

-- Chain de-duplication on the homepage.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_root
  ON articles (root_article_id);

-- Daily cron: "did an auto-article run recently" + the weekly cap.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_source_created
  ON articles ((generation_options ->> 'source'), created_at DESC);

-- Verify afterwards:
--   SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE relname = 'articles';
--   EXPLAIN ANALYZE SELECT id FROM articles
--     WHERE status IN ('complete','verified') AND visibility='published'
--       AND hidden_from_homepage=false ORDER BY created_at DESC LIMIT 200;

-- ── FOLLOW-UP, not required for the fix ──────────────────────────────────────
-- Homepage cards lost "x min read" because reading time is computed from the
-- full article body, which the listing query no longer fetches. To restore it,
-- add a stored column, backfill it, and have the pipeline write it:
--   ALTER TABLE articles ADD COLUMN reading_time integer;
-- Then add `reading_time` to the homepage select and to ArticleCardProjection.
