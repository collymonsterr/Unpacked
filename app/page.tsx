import Logo from '@/components/ui/Logo'
import SearchForm from '@/components/SearchForm'
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
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-20">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 max-w-3xl"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          AI answers
          <br />
          Elevated to
          <br />
          <span style={{ color: 'var(--accent)' }}>Editorial quality.</span>
        </h1>
        <p
          className="text-lg md:text-xl mb-10 max-w-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          Turn any prompt into a beautifully written, structured article with visuals, clarity, and a point of view.
        </p>

        <div className="w-full max-w-2xl">
          <SearchForm />
        </div>
      </section>

      {/* Recent articles */}
      <RecentArticlesGrid articles={recentArticles} />
    </div>
  )
}
