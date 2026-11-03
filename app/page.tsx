import Navbar from '@/components/ui/Navbar'
import PendingArticleRecovery from '@/components/PendingArticleRecovery'
import Footer from '@/components/ui/Footer'
import SearchHomepage from '@/components/homepage/SearchHomepage'
import MarketingHomepage from '@/components/homepage/MarketingHomepage'
import { unstable_cache } from 'next/cache'
import { toArticleCardFromProjection, type ArticleCardData, type ArticleCardProjection } from '@/lib/article-card'
import { isHiddenFromListings } from '@/lib/seo-canonical'
import { featuredPool, selectFeatured } from '@/lib/featured-rotation'
import { AUTH_TIMEOUT_MS, DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'

import type { Metadata } from 'next'

// The homepage reads cookies to choose the signed-in vs signed-out variant, so
// the route itself cannot be statically rendered. Caching the *query* gets the
// same relief: the database is read at most once per revalidate window per
// region instead of on every visit.
export const revalidate = 60

// Never hold a function for the platform default (300s) waiting on a database.
export const maxDuration = 20

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://unpacked.fyi',
  },
}

type RawRow = ArticleCardProjection & { root_article_id?: string | null }

/**
 * Read the listing rows. Not a single column of article body text is fetched —
 * only the dozen scalars the cards render, pulled out of the JSONB by Postgres.
 *
 * Wrapped in `unstable_cache` so a burst of traffic (or a crawler walking the
 * sitemap) collapses onto one database read per revalidate window.
 */
const getHomepageRows = unstable_cache(
  async (): Promise<RawRow[]> => {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const db = getSupabaseAdmin()

    const query = db
      .from('articles')
      .select(
        'id, slug, query, root_article_id, is_featured, is_trending, trending_set_at, ' +
        'view_count, user_name, user_avatar, verified_at, created_at, card_summary, category, ' +
        'title:article->>title, article_type:article->>article_type, thumbnail_url:article->>thumbnail_url, ' +
        'short_answer:article->executive_summary->>short_answer, ' +
        'one_liner:article->quick_verdict->>one_liner, ' +
        'recommendation:article->quick_verdict->>recommendation, ' +
        'first_takeaway:article->executive_summary->key_takeaways->>0, ' +
        'plan_title:plan->>title, plan_category:plan->>category, ' +
        'fact_check_probe:fact_check->>checks_performed'
      )
      .in('status', ['complete', 'verified'])
      .eq('hidden_from_homepage', false)
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(200)
      .abortSignal(dbSignal())

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as RawRow[]
  },
  ['homepage-articles-v2'],
  { revalidate: 60, tags: ['homepage-articles'] }
)

async function getHomepageData() {
  try {
    // An empty homepage is a bad page; a hanging homepage is a dead site.
    const rows = await withTimeout(getHomepageRows(), DB_TIMEOUT_MS, 'homepage articles', [] as RawRow[])

    const allArticles = rows
      // Pipeline test debris and 301'd duplicate slugs never appear in listings.
      .filter(r => !isHiddenFromListings(r.slug))

    // Deduplicate chains: for each root, keep latest
    const latestByChain = new Map<string, RawRow>()
    for (const a of allArticles) {
      const chainKey = a.root_article_id ?? a.id
      const existing = latestByChain.get(chainKey)
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        latestByChain.set(chainKey, a)
      }
    }

    // Project to the lightweight card shape before anything reaches a client
    // component — this is what keeps the initial HTML small.
    const deduplicated: ArticleCardData[] = Array.from(latestByChain.values())
      .map(toArticleCardFromProjection)

    // Featured — picked here, from the clock, so the block changes on its own
    // every few hours instead of waiting on an admin toggle.
    const featured = selectFeatured(featuredPool(deduplicated))

    // Trending pool — full pool passed to client for random rotation
    const trendingPool = deduplicated
      .filter(a => a.isTrending)
      .sort((a, b) => {
        const at = a.trendingSetAt ? new Date(a.trendingSetAt).getTime() : 0
        const bt = b.trendingSetAt ? new Date(b.trendingSetAt).getTime() : 0
        return bt - at
      })

    // Most popular — top 4 by views, fully automatic
    const popular = [...deduplicated]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 4)

    const trendingIds = new Set(trendingPool.map(a => a.id))

    // Recent Articles — newest first, minus whatever is on show above it. Only
    // the five articles Featured is *currently* showing are excluded, not the
    // whole eligible pool: that pool now holds every recent article, and hiding
    // all of it would gut this grid.
    const all = [...deduplicated]
      .filter(a => !featured.shownIds.has(a.id) && !trendingIds.has(a.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { featured, trendingPool, popular, all }
  } catch {
    return {
      featured: { hero: null, small: [], shownIds: new Set<string>() },
      trendingPool: [],
      popular: [],
      all: [],
    }
  }
}

/**
 * Detect server-side whether the visitor is signed in.
 * Returns false on any error so anonymous flow renders by default.
 */
async function isAuthenticatedVisitor(): Promise<boolean> {
  try {
    const { createServerSupabase } = await import('@/lib/supabase')
    const supabase = await createServerSupabase()
    // Supabase Auth hangs when the database is unhealthy. This only picks which
    // homepage variant renders, so falling back to "signed out" is harmless.
    const result = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      'homepage auth check',
      { data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>
    )
    return !!result.data.user
  } catch {
    return false
  }
}

export default async function HomePage() {
  const [data, isAuthed] = await Promise.all([
    getHomepageData(),
    isAuthenticatedVisitor(),
  ])
  const { featured, trendingPool, popular, all } = data

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <PendingArticleRecovery />
      {/* Nav — no search bar on homepage (hero has the main search) */}
      <Navbar showSearch={false} />

      {isAuthed ? (
        <SearchHomepage
          featured={featured}
          trendingPool={trendingPool}
          popular={popular}
          all={all}
        />
      ) : (
        <MarketingHomepage
          featured={featured}
          all={all}
          exampleSlug={featured.hero?.slug}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
