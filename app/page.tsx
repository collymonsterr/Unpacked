import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import HomepageHero from '@/components/HomepageHero'
import FeaturedSection from '@/components/homepage/FeaturedSection'
import TrendingSection from '@/components/homepage/TrendingSection'
import PopularSection from '@/components/homepage/PopularSection'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import PendingArticleRecovery from '@/components/PendingArticleRecovery'
import Footer from '@/components/ui/Footer'
import type { ArticleRow } from '@/types/article'

import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://articleai-three.vercel.app',
  },
}

async function getHomepageData() {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const db = getSupabaseAdmin()

    // Single query — get all visible articles with all flags
    const { data } = await db
      .from('articles')
      .select('id, slug, query, status, plan, article, pinned, hidden_from_homepage, sort_order, root_article_id, parent_article_id, is_featured, featured_position, is_trending, trending_set_at, view_count, user_id, user_name, user_avatar, fact_check, verified_at, created_at, updated_at, suggestion_chips')
      .in('status', ['complete', 'verified'])
      .eq('hidden_from_homepage', false)
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

    // Split into sections
    const featured = deduplicated
      .filter(a => a.is_featured)
      .sort((a, b) => {
        const ap = a.featured_position ?? 999
        const bp = b.featured_position ?? 999
        if (ap !== bp) return ap - bp
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      .slice(0, 7)

    const trending = deduplicated
      .filter(a => a.is_trending)
      .sort((a, b) => {
        const at = a.trending_set_at ? new Date(a.trending_set_at).getTime() : 0
        const bt = b.trending_set_at ? new Date(b.trending_set_at).getTime() : 0
        return bt - at
      })
      .slice(0, 4)

    const popular = [...deduplicated]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 4)

    // All articles: sorted by pinned, sort_order, then newest
    const all = deduplicated.sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned

      const aOrder = a.sort_order as number | null | undefined
      const bOrder = b.sort_order as number | null | undefined
      if (aOrder == null && bOrder != null) return -1
      if (aOrder != null && bOrder == null) return 1
      if (aOrder != null && bOrder != null) return aOrder - bOrder

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return { featured, trending, popular, all }
  } catch {
    return { featured: [], trending: [], popular: [], all: [] }
  }
}

export default async function HomePage() {
  const { featured, trending, popular, all } = await getHomepageData()

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <PendingArticleRecovery />
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <a
            href="/about"
            className="text-sm font-medium no-underline hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            About
          </a>
          <a
            href="/creators"
            className="text-sm font-medium no-underline hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            Creators
          </a>
          <UserMenu />
        </div>
      </nav>

      {/* Hero + feature cards (auth-conditional) */}
      <HomepageHero existingQueries={all.map(a => a.query)} />

      {/* Featured */}
      {featured.length > 0 && (
        <>
          <FeaturedSection articles={featured} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Trending Today */}
      {trending.length > 0 && (
        <>
          <TrendingSection articles={trending} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Most Popular */}
      {popular.length > 0 && (
        <>
          <PopularSection articles={popular} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* All Articles */}
      <RecentArticlesGrid articles={all} />

      {/* Footer */}
      <Footer />
    </div>
  )
}
