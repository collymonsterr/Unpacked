import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import HomepageHero from '@/components/HomepageHero'
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

async function getRecentArticles(): Promise<ArticleRow[]> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, query, status, plan, article, pinned, hidden_from_homepage, sort_order, root_article_id, parent_article_id, created_at')
      .in('status', ['complete', 'verified'])
      .eq('hidden_from_homepage', false)
      .order('pinned', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(200)

    // For each article chain (grouped by root_article_id), only show the latest version
    const allArticles = data ?? []
    const latestByChain = new Map<string, typeof allArticles[0]>()
    for (const a of allArticles) {
      const chainKey = (a.root_article_id ?? a.id) as string
      const existing = latestByChain.get(chainKey)
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        latestByChain.set(chainKey, a)
      }
    }

    // Sort: pinned first, then by sort_order (null = new = first), then newest
    const articles = Array.from(latestByChain.values()).sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned

      const aOrder = a.sort_order as number | null | undefined
      const bOrder = b.sort_order as number | null | undefined

      // New articles (no sort_order) come before manually ordered ones
      if (aOrder == null && bOrder != null) return -1
      if (aOrder != null && bOrder == null) return 1
      if (aOrder != null && bOrder != null) return aOrder - bOrder

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return articles as ArticleRow[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const recentArticles = await getRecentArticles()

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
      <HomepageHero existingQueries={recentArticles.map(a => a.query)} />

      {/* Recent articles */}
      <RecentArticlesGrid articles={recentArticles} />

      {/* Footer */}
      <Footer />
    </div>
  )
}
