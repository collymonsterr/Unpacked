import { getSupabaseAdmin } from '@/lib/supabase'
import { dbSignal } from '@/lib/db-timeout'

export const dynamic = 'force-dynamic'

// Navbar autocomplete — fires as the reader types, so it must never hold a
// function open waiting on a slow database.
export const maxDuration = 10

/**
 * Navbar autocomplete search.
 *
 * The articles table stores the title inside the `article` JSONB column
 * (article->>title), not as a top-level column. We search:
 *   1. article->>title (the actual displayed title — highest relevance)
 *   2. query (the original user query) + slug (derived from title)
 *   3. card_summary + category (supplementary)
 *
 * Results are deduplicated and merged with title matches first.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')

    if (!query || query.length < 2) {
      return Response.json({ results: [] })
    }

    const db = getSupabaseAdmin()

    // Sanitize query for ilike — escape special postgres characters
    const sanitized = query.replace(/[%_\\]/g, '\\$&')
    const pattern = `%${sanitized}%`

    // Convert spaces to wildcard gaps for slug matching (slugs use hyphens)
    const slugPattern = `%${sanitized.replace(/\s+/g, '%')}%`

    // Select the article title from JSONB alongside top-level columns
    const selectFields = 'id, slug, query, category, view_count, card_summary, article->title'

    // Primary: article title matches (the actual displayed title — highest relevance)
    const titlePromise = db
      .from('articles')
      .select(selectFields)
      .filter('article->>title', 'ilike', pattern)
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
      .abortSignal(dbSignal())

    // Secondary: query text + slug matches
    const querySlugPromise = db
      .from('articles')
      .select(selectFields)
      .or(`query.ilike.${pattern},slug.ilike.${slugPattern}`)
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
      .abortSignal(dbSignal())

    // Tertiary: card_summary + category matches
    const tertiaryPromise = db
      .from('articles')
      .select(selectFields)
      .or(`card_summary.ilike.${pattern},category.ilike.${pattern}`)
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
      .abortSignal(dbSignal())

    const [titleResult, querySlugResult, tertiaryResult] = await Promise.all([
      titlePromise,
      querySlugPromise,
      tertiaryPromise,
    ])

    // Merge and deduplicate: title matches first, then query/slug, then tertiary
    const seen = new Set<string>()
    const merged: Array<{
      id: string
      slug: string
      query: string
      title: string | null
      category: string | null
      view_count: number
      card_summary: string | null
    }> = []

    for (const batch of [titleResult.data, querySlugResult.data, tertiaryResult.data]) {
      for (const r of (batch ?? [])) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          merged.push({
            ...r,
            title: typeof r.title === 'string' ? r.title : null,
          })
        }
      }
    }

    // Return top 6 results with the real article title
    const results = merged.slice(0, 6).map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title || r.query,
      category: r.category,
      view_count: r.view_count,
      card_summary: r.card_summary,
    }))

    return Response.json({ results })
  } catch (err) {
    console.error('[article-search]', err)
    return Response.json({ results: [] })
  }
}
