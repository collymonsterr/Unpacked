import { redirect } from 'next/navigation'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import DashboardTabs from '@/components/DashboardTabs'
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
        <DashboardTabs myArticles={rows} totalViews={totalViews} />
      </div>
    </div>
  )
}
