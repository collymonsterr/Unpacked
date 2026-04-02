import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  // Recent negative feedback with article info
  const { data: negative } = await db
    .from('article_feedback')
    .select('id, article_id, vote, reasons, comment, created_at')
    .eq('vote', 'needs_work')
    .order('created_at', { ascending: false })
    .limit(30)

  // Get article titles for the feedback entries
  const articleIds = [...new Set((negative ?? []).map(f => f.article_id))]
  const { data: articles } = articleIds.length > 0
    ? await db
        .from('articles')
        .select('id, title, slug')
        .in('id', articleIds)
    : { data: [] }

  const articleMap = new Map((articles ?? []).map(a => [a.id, a]))

  const negativeFeedback = (negative ?? []).map(f => ({
    id: f.id,
    article_id: f.article_id,
    article_title: articleMap.get(f.article_id)?.title ?? 'Unknown',
    article_slug: articleMap.get(f.article_id)?.slug ?? '',
    reasons: f.reasons ?? [],
    comment: f.comment,
    created_at: f.created_at,
  }))

  // Weekly summary
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: weeklyVotes } = await db
    .from('article_feedback')
    .select('vote, reasons')
    .gte('created_at', weekAgo)

  const totalWeek = weeklyVotes?.length ?? 0
  const goodWeek = weeklyVotes?.filter(v => v.vote === 'good').length ?? 0
  const positivePercent = totalWeek > 0 ? Math.round((goodWeek / totalWeek) * 100) : 0

  // Count negative reasons
  const reasonCounts: Record<string, number> = {}
  for (const v of weeklyVotes ?? []) {
    if (v.vote === 'needs_work' && Array.isArray(v.reasons)) {
      for (const r of v.reasons) {
        reasonCounts[r] = (reasonCounts[r] || 0) + 1
      }
    }
  }
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return Response.json({
    negativeFeedback,
    summary: {
      totalWeek,
      positivePercent,
      topReasons,
    },
  })
}
