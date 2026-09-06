import Navbar from '@/components/ui/Navbar'
import PendingArticleRecovery from '@/components/PendingArticleRecovery'
import Footer from '@/components/ui/Footer'
import SearchHomepage from '@/components/homepage/SearchHomepage'
import MarketingHomepage from '@/components/homepage/MarketingHomepage'
import { toArticleCard, type ArticleCardData, type ArticleCardSource } from '@/lib/article-card'
import { isHiddenFromListings } from '@/lib/seo-canonical'

import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://unpacked.fyi',
  },
}

async function getHomepageData() {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const db = getSupabaseAdmin()

    // Single query — get all visible articles with all flags.
    //
    // `plan` and `fact_check` are projected down to the one scalar each that the
    // cards actually need (category, and "did a fact-check run"), and
    // `suggestion_chips` is not read on the homepage at all. `article` is still
    // fetched whole because reading time needs the section text — but it never
    // leaves the server: everything below runs on the projected card shape.
    const { data } = await db
      .from('articles')
      .select('id, slug, query, article, root_article_id, is_featured, is_trending, trending_set_at, view_count, user_name, user_avatar, verified_at, created_at, card_summary, category, plan_category:plan->>category, fact_check_probe:fact_check->>checks_performed')
      .in('status', ['complete', 'verified'])
      .eq('hidden_from_homepage', false)
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(200)

    type RawRow = ArticleCardSource & {
      root_article_id?: string | null
      plan_category?: string | null
      fact_check_probe?: string | null
    }

    const allArticles = ((data ?? []) as unknown as RawRow[])
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
    const deduplicated: ArticleCardData[] = Array.from(latestByChain.values()).map(r =>
      toArticleCard({
        ...r,
        plan: r.plan_category ? { category: r.plan_category } : null,
        fact_check: r.fact_check_probe ?? null,
      })
    )

    // Featured pool — full pool passed to client for random rotation
    const featuredPool = deduplicated
      .filter(a => a.isFeatured)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

    // IDs in featured and trending pools — used for exclusions
    const featuredIds = new Set(featuredPool.map(a => a.id))
    const trendingIds = new Set(trendingPool.map(a => a.id))
    const trendingIdList = trendingPool.map(a => a.id)

    // Recent Articles — newest first, excluding featured and trending
    const all = [...deduplicated]
      .filter(a => !featuredIds.has(a.id) && !trendingIds.has(a.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { featuredPool, trendingPool, trendingIdList, popular, all }
  } catch {
    return { featuredPool: [], trendingPool: [], trendingIdList: [], popular: [], all: [] }
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
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch {
    return false
  }
}

export default async function HomePage() {
  const [data, isAuthed] = await Promise.all([
    getHomepageData(),
    isAuthenticatedVisitor(),
  ])
  const { featuredPool, trendingPool, trendingIdList, popular, all } = data

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <PendingArticleRecovery />
      {/* Nav — no search bar on homepage (hero has the main search) */}
      <Navbar showSearch={false} />

      {isAuthed ? (
        <SearchHomepage
          featuredPool={featuredPool}
          trendingPool={trendingPool}
          trendingIdList={trendingIdList}
          popular={popular}
          all={all}
        />
      ) : (
        <MarketingHomepage
          featuredPool={featuredPool}
          trendingIdList={trendingIdList}
          all={all}
          exampleSlug={featuredPool[0]?.slug}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
