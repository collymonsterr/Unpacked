import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  // Recent negative feedback with article info
  // Try with resolved column first; if it doesn't exist yet, fall back without it
  let negative: Array<Record<string, unknown>> | null = null
  {
    const { data, error } = await db
      .from('article_feedback')
      .select('id, article_id, vote, reasons, comment, resolved, created_at')
      .eq('vote', 'needs_work')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error && error.message.includes('resolved')) {
      // Column doesn't exist yet — query without it
      const { data: fallback } = await db
        .from('article_feedback')
        .select('id, article_id, vote, reasons, comment, created_at')
        .eq('vote', 'needs_work')
        .order('created_at', { ascending: false })
        .limit(30)
      negative = fallback
    } else {
      negative = data
    }
  }

  // Get article titles from JSONB article column (no top-level title column exists)
  const articleIds = [...new Set((negative ?? []).map(f => f.article_id))]
  const { data: articles } = articleIds.length > 0
    ? await db
        .from('articles')
        .select('id, slug, article->title')
        .in('id', articleIds)
    : { data: [] }

  const articleMap = new Map(
    (articles ?? []).map((a: Record<string, unknown>) => [
      a.id as string,
      {
        title: typeof a.title === 'string' ? a.title : null,
        slug: a.slug as string,
      },
    ])
  )

  const negativeFeedback = (negative ?? []).map(f => {
    const art = articleMap.get(f.article_id as string)
    return {
      id: f.id,
      article_id: f.article_id,
      article_title: art?.title ?? null,
      article_slug: art?.slug ?? null,
      resolved: f.resolved ?? false,
      reasons: f.reasons ?? [],
      comment: f.comment,
      created_at: f.created_at,
    }
  })

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

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const { id, resolved } = await req.json()
  if (!id || typeof resolved !== 'boolean') {
    return Response.json({ error: 'Missing id or resolved' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('article_feedback')
    .update({ resolved })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
