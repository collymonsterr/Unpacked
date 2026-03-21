import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import SearchForm from '@/components/SearchForm'
import ExampleChips from '@/components/ExampleChips'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import type { ArticleRow } from '@/types/article'

export const dynamic = 'force-dynamic'

async function getRecentArticles(): Promise<ArticleRow[]> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, query, status, plan, article, pinned, created_at')
      .eq('status', 'complete')
      .order('pinned', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)

    // Sort by sort_order (stored in article JSONB), then by created_at
    const articles = (data ?? []).sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      const aOrder = (a.article as Record<string, unknown>)?.sort_order as number | undefined
      const bOrder = (b.article as Record<string, unknown>)?.sort_order as number | undefined
      if (aOrder != null && bOrder != null) return aOrder - bOrder
      if (aOrder != null) return -1
      if (bOrder != null) return 1
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
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <a
            href="/creators"
            className="text-sm font-medium no-underline hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            For Creators
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
          Type a question.
          <br />
          Get a complete
          <br />
          <span style={{ color: 'var(--accent)' }}>visual article.</span>
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
      <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pb-12">
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
              Beautiful, structured articles with images, charts, and interactive tools that bring the answer to life.
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
              We do the digging for you — across websites, Reddit, X, expert reviews, and real user opinions — then turn it into one clear article.
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
              Decisive, not generic
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              AI gives you &ldquo;it depends.&rdquo; We show you what people actually recommend — so you can make a confident decision.
            </p>
          </div>
        </div>
      </section>

      {/* Recent articles */}
      <RecentArticlesGrid articles={recentArticles} />
    </div>
  )
}
