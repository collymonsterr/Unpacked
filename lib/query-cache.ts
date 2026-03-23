import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * Normalize a query for comparison: lowercase, trim, remove punctuation,
 * collapse whitespace, remove common filler words.
 */
function normalize(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[''""]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if two normalized queries are similar enough to be considered the same topic.
 * Uses word overlap: if 80%+ of the shorter query's significant words appear in the longer one.
 */
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true

  const wordsA = a.split(' ').filter(w => w.length > 2)
  const wordsB = b.split(' ').filter(w => w.length > 2)

  if (wordsA.length === 0 || wordsB.length === 0) return false

  // Use the shorter query's words as the reference
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA]
  const longerSet = new Set(longer)

  const matchCount = shorter.filter(w => longerSet.has(w)).length
  const matchRatio = matchCount / shorter.length

  return matchRatio >= 0.8
}

/**
 * Find a recently generated article that matches the given query.
 * Looks at articles from the last 48 hours with status complete or verified.
 * Returns the matching article's slug and title, or null if no match.
 */
export async function findCachedArticle(query: string): Promise<{ slug: string; title: string; id: string } | null> {
  try {
    const db = getSupabaseAdmin()
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data } = await db
      .from('articles')
      .select('id, slug, query, article')
      .in('status', ['complete', 'verified'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data || data.length === 0) return null

    const normalizedQuery = normalize(query)

    for (const row of data) {
      if (!row.query) continue
      const normalizedExisting = normalize(row.query)

      if (isSimilar(normalizedQuery, normalizedExisting)) {
        return {
          slug: row.slug,
          title: row.article?.title ?? row.query,
          id: row.id,
        }
      }
    }

    return null
  } catch {
    return null // Never block article creation if cache check fails
  }
}
