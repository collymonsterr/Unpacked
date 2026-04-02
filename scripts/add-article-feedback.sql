-- Migration: Replace old article_feedback table with new schema
-- The old table had columns: article_id, user_id, rating ('up'/'down'), reason (text)
-- The new table adds: vote ('good'/'needs_work'), reasons (text array), comment (text)

-- Drop the old table if it exists (it had a different schema)
DROP TABLE IF EXISTS article_feedback;

CREATE TABLE article_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID,
  vote TEXT NOT NULL CHECK (vote IN ('good', 'needs_work')),
  reasons TEXT[] DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feedback_article ON article_feedback(article_id);
CREATE INDEX idx_feedback_created ON article_feedback(created_at DESC);
