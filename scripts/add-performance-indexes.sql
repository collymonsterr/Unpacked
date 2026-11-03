-- Indexes for the listing queries.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. It is safe to run more than once (IF NOT EXISTS), and it should
-- finish in under a second on a table this size.
--
-- Deliberately NOT "CREATE INDEX CONCURRENTLY": that cannot run inside a
-- transaction block, which is how the SQL editor executes a pasted script, so
-- it would fail. CONCURRENTLY exists to avoid locking a big table during the
-- build; `articles` is ~360 rows, so a plain build takes milliseconds and the
-- brief lock is not worth the extra complexity.
--
-- Honest expectation: these help the planner and the sorts, but they are NOT
-- the fix for the Disk IO budget alert. That is driven by WRITE volume — see
-- CLAUDE.md "Writes to `articles` are expensive".

-- Homepage: status + visibility + hidden_from_homepage, newest first.
CREATE INDEX IF NOT EXISTS idx_articles_homepage
  ON articles (created_at DESC)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published'
    AND hidden_from_homepage = false;

-- Category pages: same filter plus category.
CREATE INDEX IF NOT EXISTS idx_articles_category_listing
  ON articles (category, created_at DESC)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Category "popular" and "verified" sorts.
CREATE INDEX IF NOT EXISTS idx_articles_category_popular
  ON articles (category, view_count DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

CREATE INDEX IF NOT EXISTS idx_articles_category_verified
  ON articles (category, verified_at DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Sitemap and internal links.
CREATE INDEX IF NOT EXISTS idx_articles_published_views
  ON articles (view_count DESC NULLS LAST)
  WHERE status IN ('complete', 'verified')
    AND visibility = 'published';

-- Admin/homepage flag lookups.
CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON articles (created_at DESC) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_articles_trending
  ON articles (trending_set_at DESC) WHERE is_trending = true;

-- Chain de-duplication on the homepage.
CREATE INDEX IF NOT EXISTS idx_articles_root
  ON articles (root_article_id);

-- Daily cron: "did an auto-article run recently" + the weekly cap.
CREATE INDEX IF NOT EXISTS idx_articles_source_created
  ON articles ((generation_options ->> 'source'), created_at DESC);

-- The view-rate limiter and analytics read this constantly.
CREATE INDEX IF NOT EXISTS idx_article_views_article
  ON article_views (article_id, created_at DESC);

-- Check what landed:
SELECT indexrelname AS index_name, idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE relname IN ('articles', 'article_views')
ORDER BY indexrelname;
