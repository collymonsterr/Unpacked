-- Session 1.9: Social content repurposing
-- Stores auto-generated social media content (X thread, LinkedIn post, Reddit summary, image card data)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS social_content JSONB DEFAULT NULL;
