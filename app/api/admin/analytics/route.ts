import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getSupabaseAdmin()

  // All articles for visibility/status breakdown
  const { data: allArticles } = await db
    .from('articles')
    .select('id, slug, article, view_count, status, category, plan, visibility, created_at')

  // Filter to complete/verified for analytics (same as before)
  const articles = (allArticles ?? []).filter(a => a.status === 'complete' || a.status === 'verified')
  const totalViews = (articles ?? []).reduce((sum, a) => sum + (a.view_count ?? 0), 0)

  // Visibility breakdown across ALL articles
  const visibilityBreakdown = {
    published: 0,
    unlisted: 0,
    private: 0,
    error: 0,
    total: (allArticles ?? []).length,
  }
  for (const a of allArticles ?? []) {
    if (a.status === 'error') {
      visibilityBreakdown.error++
    } else if (a.visibility === 'private') {
      visibilityBreakdown.private++
    } else if (a.visibility === 'unlisted') {
      visibilityBreakdown.unlisted++
    } else {
      visibilityBreakdown.published++
    }
  }

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

  // Content health metrics
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo2 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const noHeroImage = articles.filter(a => !a.article?.thumbnail_url).length
  const noFactCheck = articles.filter(a => a.status !== 'verified').length
  const zeroViews = articles.filter(a => (a.view_count ?? 0) === 0).length
  const last7Days = (allArticles ?? []).filter(a => new Date(a.created_at) >= sevenDaysAgo).length
  const last30Days = (allArticles ?? []).filter(a => new Date(a.created_at) >= thirtyDaysAgo2).length

  // Average article word count across published articles
  let totalWords = 0
  let countedArticles = 0
  for (const a of articles) {
    if (a.article?.sections) {
      let words = 0
      for (const s of a.article.sections as Array<Record<string, unknown>>) {
        if (typeof s.body === 'string') words += s.body.split(/\s+/).length
        if (typeof s.content === 'string') words += s.content.split(/\s+/).length
        if (typeof s.intro === 'string') words += s.intro.split(/\s+/).length
      }
      if (words > 0) {
        totalWords += words
        countedArticles++
      }
    }
  }
  const avgWordCount = countedArticles > 0 ? Math.round(totalWords / countedArticles) : 0

  const contentHealth = {
    noHeroImage,
    noFactCheck,
    zeroViews,
    last7Days,
    last30Days,
    avgWordCount,
  }

  return NextResponse.json({
    totalViews,
    totalArticles,
    visibilityBreakdown,
    contentHealth,
    topArticles,
    viewsByType,
    articlesByType,
    articlesByCategory,
    viewsTimeSeries,
  })
}
