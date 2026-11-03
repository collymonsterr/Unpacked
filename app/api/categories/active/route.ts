import { unstable_cache } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/category-config'
import { DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'

const MIN_ARTICLES = 5

// The Navbar calls this on EVERY page of the site, so it is the most frequently
// hit database path we have. It previously had no timeout and no server-side
// cache — only a CDN header — so every cache miss read the category column for
// every published article, and a slow database turned that into a hanging
// function (2.9 minutes observed during the Nov 2026 Disk IO episode).
export const maxDuration = 15

/** All categories, unfiltered — what we show when the database can't answer. */
const FALLBACK = CATEGORIES.map(c => ({ slug: c.slug, name: c.name, count: 0 }))

/**
 * Counts change at most once a day, when an article publishes. Caching for an
 * hour collapses every concurrent miss onto a single database read.
 */
const getActiveCategories = unstable_cache(
  async () => {
    const db = getSupabaseAdmin()
    const { data, error } = await db
      .from('articles')
      .select('category')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .not('category', 'is', null)
      .abortSignal(dbSignal())

    // Throw rather than return a fallback: unstable_cache stores whatever it is
    // given, and caching "no categories" would empty the nav for an hour.
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      if (row.category) counts[row.category] = (counts[row.category] ?? 0) + 1
    }

    return CATEGORIES
      .map(c => ({ slug: c.slug, name: c.name, dbValue: c.dbValue, count: counts[c.dbValue] ?? 0 }))
      .filter(c => c.count >= MIN_ARTICLES)
  },
  ['active-categories-v1'],
  { revalidate: 3600, tags: ['articles'] }
)

export async function GET() {
  const categories = await withTimeout(
    getActiveCategories(),
    DB_TIMEOUT_MS,
    'active categories',
    FALLBACK
  )

  return Response.json(
    { categories },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } }
  )
}
