import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

/**
 * GET /api/articles/[id]/research
 *
 * Returns the full research data for an article — findings, entity cards,
 * synthesis, blueprint. Used by the Editor Co-Pilot tab.
 *
 * Only accessible to the article owner or admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) {
    return Response.json({ error: 'Invalid article ID' }, { status: 400 })
  }

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: row, error } = await db
    .from('articles')
    .select('research_findings, entity_cards, research_synthesis, blueprint, live_data, plan')
    .eq('id', id)
    .single()

  if (error || !row) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  return Response.json({
    research_findings: row.research_findings ?? [],
    entity_cards: row.entity_cards ?? [],
    synthesis: row.research_synthesis ?? null,
    blueprint: row.blueprint ?? null,
    live_data: row.live_data ?? [],
    alternative_types: row.plan?.alternative_types ?? [],
    article_type: row.plan?.article_type ?? null,
  })
}
