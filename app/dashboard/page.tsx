import { redirect } from 'next/navigation'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import ArticleTypeBadge from '@/components/ui/ArticleTypeBadge'
import Link from 'next/link'
import type { ArticleRow } from '@/types/article'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let userId: string | null = null

  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Not authenticated
  }

  if (!userId) {
    redirect('/')
  }

  // Fetch user's articles
  const { data: articles } = await getSupabaseAdmin()
    .from('articles')
    .select('id, slug, query, status, plan, article, pinned, user_name, user_avatar, view_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const rows = (articles ?? []) as ArticleRow[]
  const totalViews = rows.reduce((sum, r) => sum + (r.view_count ?? 0), 0)

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <UserMenu />
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
        <div className="flex items-baseline justify-between mb-1">
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            My Articles
          </h1>
          {rows.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total views</p>
                <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
                  {totalViews.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Articles you&apos;ve created
        </p>

        {rows.length === 0 ? (
          <div
            className="rounded-2xl px-8 py-16 text-center"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              No articles yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Type a question on the homepage to create your first article.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontFamily: 'var(--font-sora)',
              }}
            >
              Create an article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((row) => {
              const title =
                row.article?.title ?? row.plan?.title ?? row.query
              const thumbnail = row.article?.thumbnail_url
              const articleType = row.article?.article_type
              const date = new Date(row.created_at).toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
              )
              const isComplete = row.status === 'complete'

              return (
                <Link
                  key={row.id}
                  href={`/article/${row.slug}`}
                  className="group rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-full overflow-hidden"
                    style={{
                      aspectRatio: '16 / 9',
                      backgroundColor: 'var(--accent-light)',
                    }}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          className="text-3xl font-bold"
                          style={{ color: 'var(--accent)', opacity: 0.3 }}
                        >
                          A
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {articleType && <ArticleTypeBadge type={articleType} />}
                      {!isComplete && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: row.status === 'error' ? '#fef2f2' : '#fef3c7',
                            color: row.status === 'error' ? '#dc2626' : '#b45309',
                          }}
                        >
                          {row.status}
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-sm font-bold leading-snug line-clamp-2 mb-2"
                      style={{
                        fontFamily: 'var(--font-sora)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {date}
                      </p>
                      {(row.view_count ?? 0) > 0 && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                          {(row.view_count ?? 0).toLocaleString()} views
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
