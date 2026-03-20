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
      .select('id, slug, query, status, plan, article, created_at')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(20)
    return (data ?? []) as ArticleRow[]
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
          AI answers,
          <br />
          <span style={{ color: 'var(--accent)' }}>elevated to editorial quality.</span>
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
