import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/costs/articles
 *
 * Returns the 20 most recent articles with per-article cost and timing data.
 * Admin only.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  try {
    // Fetch recent articles with cost and generation options
    const { data: articles, error: articlesErr } = await db
      .from('articles')
      .select('id, title, slug, article_type, status, total_cost, generation_options, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (articlesErr) throw articlesErr
    if (!articles || articles.length === 0) {
      return NextResponse.json({ articles: [] })
    }

    // Batch fetch the writing model for each article from api_usage_log
    const articleIds = articles.map(a => a.id)
    const { data: writeLogs } = await db
      .from('api_usage_log')
      .select('article_id, model')
      .in('article_id', articleIds)
      .eq('call_type', 'write')

    // Build a map of article_id → writing model
    const writeModelMap = new Map<string, string>()
    for (const log of (writeLogs ?? [])) {
      if (log.article_id && !writeModelMap.has(log.article_id)) {
        writeModelMap.set(log.article_id, log.model)
      }
    }

    // Shape the response
    const result = articles.map(a => {
      const genOpts = a.generation_options as Record<string, unknown> | null
      const timings = (genOpts?.timings ?? null) as Record<string, number> | null

      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        article_type: a.article_type,
        status: a.status,
        total_cost: a.total_cost ? Number(a.total_cost) : null,
        write_model: writeModelMap.get(a.id) ?? null,
        timings: timings ? {
          planning_ms: timings.planning_ms ?? null,
          research_ms: timings.research_ms ?? null,
          blueprint_ms: timings.blueprint_ms ?? null,
          writing_ms: timings.writing_ms ?? null,
          editorial_ms: timings.editorial_ms ?? null,
          factcheck_ms: timings.factcheck_ms ?? null,
          total_ms: timings.total_ms ?? null,
        } : null,
        created_at: a.created_at,
      }
    })

    return NextResponse.json({ articles: result })
  } catch (err) {
    console.error('[admin/costs/articles]', err)
    return NextResponse.json({ error: 'Failed to fetch article costs' }, { status: 500 })
  }
}
