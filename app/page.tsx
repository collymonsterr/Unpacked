import Navbar from '@/components/ui/Navbar'
import PendingArticleRecovery from '@/components/PendingArticleRecovery'
import Footer from '@/components/ui/Footer'
import SearchHomepage from '@/components/homepage/SearchHomepage'
import MarketingHomepage from '@/components/homepage/MarketingHomepage'
import type { ArticleRow } from '@/types/article'

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

    // Single query — get all visible articles with all flags
    const { data } = await db
      .from('articles')
      .select('id, slug, query, status, plan, article, hidden_from_homepage, root_article_id, parent_article_id, is_featured, is_trending, trending_set_at, view_count, user_id, user_name, user_avatar, fact_check, verified_at, created_at, updated_at, suggestion_chips, card_summary, category')
      .in('status', ['complete', 'verified'])
      .eq('hidden_from_homepage', false)
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(200)

    const allArticles = (data ?? []) as ArticleRow[]

    // Deduplicate chains: for each root, keep latest
    const latestByChain = new Map<string, ArticleRow>()
    for (const a of allArticles) {
      const chainKey = a.root_article_id ?? a.id
      const existing = latestByChain.get(chainKey)
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        latestByChain.set(chainKey, a)
      }
    }
    const deduplicated = Array.from(latestByChain.values())

    // Featured pool — full pool passed to client for random rotation
    const featuredPool = deduplicated
      .filter(a => a.is_featured)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Trending pool — full pool passed to client for random rotation
    const trendingPool = deduplicated
      .filter(a => a.is_trending)
      .sort((a, b) => {
        const at = a.trending_set_at ? new Date(a.trending_set_at).getTime() : 0
        const bt = b.trending_set_at ? new Date(b.trending_set_at).getTime() : 0
        return bt - at
      })

    // Most popular — top 4 by views, fully automatic
    const popular = [...deduplicated]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 4)

    // IDs in featured and trending pools — used for exclusions
    const featuredIds = new Set(featuredPool.map(a => a.id))
    const trendingIds = new Set(trendingPool.map(a => a.id))
    const trendingIdList = trendingPool.map(a => a.id)

    // Recent Articles — newest first, excluding featured and trending
    const all = [...deduplicated]
      .filter(a => !featuredIds.has(a.id) && !trendingIds.has(a.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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
