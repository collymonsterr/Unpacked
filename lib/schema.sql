-- Run this in the Supabase SQL editor to set up the articles table

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  plan JSONB,
  article JSONB,
  suggestion_chips JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_updated_at ON articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Allow public reads (articles are public once complete)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read complete articles"
  ON articles FOR SELECT
  USING (status = 'complete' OR status = 'generating' OR status = 'planning');

-- Service role has full access (used by API routes with service key)
