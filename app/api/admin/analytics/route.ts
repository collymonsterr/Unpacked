import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getSupabaseAdmin()

  // Total views across all articles
  const { data: articles } = await db
    .from('articles')
    .select('id, slug, article, view_count, status, category, plan')
    .in('status', ['complete', 'verified'])

  const totalViews = (articles ?? []).reduce((sum, a) => sum + (a.view_count ?? 0), 0)

  // Top 5 articles by views
  const topArticles = (articles ?? [])
    .filter(a => (a.view_count ?? 0) > 0)
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 5)
    .map(a => ({
      title: a.article?.title?.slice(0, 50) ?? 'Untitled',
      slug: a.slug,
      views: a.view_count ?? 0,
    }))

  // Views by article type
  const viewsByType: Record<string, number> = {}
  for (const a of articles ?? []) {
    const type = a.article?.article_type ?? 'unknown'
    viewsByType[type] = (viewsByType[type] ?? 0) + (a.view_count ?? 0)
  }

  // Views time series from article_views table (last 30 days)
  let viewsTimeSeries: { date: string; views: number }[] = []
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: viewRows } = await db
      .from('article_views')
      .select('viewed_at')
      .gte('viewed_at', thirtyDaysAgo.toISOString())
      .order('viewed_at', { ascending: true })

    if (viewRows && viewRows.length > 0) {
      // Group by date
      const byDate: Record<string, number> = {}
      for (const row of viewRows) {
        const date = new Date(row.viewed_at).toISOString().split('T')[0]
        byDate[date] = (byDate[date] ?? 0) + 1
      }

      // Gap-fill last 30 days
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const dateStr = d.toISOString().split('T')[0]
        viewsTimeSeries.push({
          date: dateStr,
          views: byDate[dateStr] ?? 0,
        })
      }
    } else {
      // No article_views data — generate empty 30-day series
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        viewsTimeSeries.push({
          date: d.toISOString().split('T')[0],
          views: 0,
        })
      }
    }
  } catch {
    // article_views table might not exist — return empty series
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      viewsTimeSeries.push({
        date: d.toISOString().split('T')[0],
        views: 0,
      })
    }
  }

  // Article counts
  const totalArticles = (articles ?? []).length
  const articlesByType: Record<string, number> = {}
  for (const a of articles ?? []) {
    const type = a.article?.article_type ?? 'unknown'
    articlesByType[type] = (articlesByType[type] ?? 0) + 1
  }

  // Articles by category — uses top-level column or falls back to plan JSONB
  const ALL_CATEGORIES = [
    'Tech', 'Finance', 'Health', 'Travel', 'Home', 'Entertainment',
    'Science', 'Business', 'Automotive', 'Culture', 'Current Affairs', 'AI & Future',
  ]
  const articlesByCategory: Record<string, number> = {}
  for (const cat of ALL_CATEGORIES) articlesByCategory[cat] = 0
  for (const a of articles ?? []) {
    const cat = (a as Record<string, unknown>).category as string | undefined
      ?? (a.plan as Record<string, unknown> | null)?.category as string | undefined
    if (cat) {
      articlesByCategory[cat] = (articlesByCategory[cat] ?? 0) + 1
    }
  }

  return NextResponse.json({
    totalViews,
    totalArticles,
    topArticles,
    viewsByType,
    articlesByType,
    articlesByCategory,
    viewsTimeSeries,
  })
}
