import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import SearchForm from '@/components/SearchForm'
import ExampleChips from '@/components/ExampleChips'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import PendingArticleRecovery from '@/components/PendingArticleRecovery'
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

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-14">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 max-w-3xl"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Type a Question
          <br />
          Get a Complete
          <br />
          <span style={{ color: 'var(--accent)' }}>Visual Article</span>
        </h1>
        <p
          className="text-lg md:text-xl mb-10 max-w-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          Researched from real sources. Written with a clear opinion. Ready in under two minutes.
        </p>

        <div className="w-full max-w-2xl">
          <SearchForm />
          <ExampleChips existingQueries={recentArticles.map(a => a.query)} />
        </div>
      </section>

      {/* How it works — above articles */}
      <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: 'var(--accent-light)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3
              className="text-base font-bold mb-1.5"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Visual, not walls of text
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Beautiful, structured articles with images, charts, and interactive tools.
            </p>
          </div>

          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: 'var(--accent-light)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h3
              className="text-base font-bold mb-1.5"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Researched, not generated
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We research websites, forums, Reddit, and X — real opinions into one article.
            </p>
          </div>

          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: 'var(--accent-light)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3
              className="text-base font-bold mb-1.5"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Verified, not guessed
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Each article is independently verified against real sources by a dedicated agent.
            </p>
          </div>
        </div>
      </section>

      {/* Recent articles */}
      <RecentArticlesGrid articles={recentArticles} />
    </div>
  )
}
