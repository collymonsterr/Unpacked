import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

/**
 * POST /api/articles/[id]/remove-quote
 *
 * Removes a quote/insight from community_insights, OR a tweet from twitter_findings.
 * Owner-only (or admin).
 *
 * Body:
 *   { type: 'quote' | 'insight', index: number }   — community_insights items
 *   { type: 'twitter', id: string }                 — single tweet by TwitterFinding.id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  try {
    // Auth check
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const db = getSupabaseAdmin()

    // Fetch article
    const { data: row, error: fetchErr } = await db
      .from('articles')
      .select('article, user_id, twitter_findings, twitter_summary')
      .eq('id', id)
      .single()

    if (fetchErr || !row) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }

    // Permission check: owner or admin
    const isOwner = row.user_id === user.id
    const isAdmin = user.email === process.env.ADMIN_EMAIL || user.id === process.env.ADMIN_USER_ID
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { type, index, id: itemId } = body as { type?: string; index?: number; id?: string }

    // ── Twitter branch: remove a single tweet by id from the top-level twitter_findings array ──
    if (type === 'twitter') {
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return Response.json({ error: 'Invalid request: twitter removal needs id' }, { status: 400 })
      }

      const current = Array.isArray(row.twitter_findings) ? row.twitter_findings : []
      const next = current.filter((t: { id?: string }) => t?.id !== itemId)

      // If the removal dropped us below 2 findings the section will hide entirely;
      // also clear the summary because it no longer reflects the reduced set.
      const nextSummary = next.length >= 2 ? row.twitter_summary ?? null : null

      const { error: updateErr } = await db
        .from('articles')
        .update({
          twitter_findings: next,
          twitter_summary: nextSummary,
        })
        .eq('id', id)

      if (updateErr) {
        console.error('[remove-quote] Twitter update failed:', updateErr.message)
        return Response.json({ error: 'Failed to update article' }, { status: 500 })
      }

      return Response.json({
        success: true,
        twitter_findings: next,
        twitter_summary: nextSummary,
      })
    }

    if (!type || typeof index !== 'number' || index < 0) {
      return Response.json({ error: 'Invalid request: need type (quote|insight|twitter) and index/id' }, { status: 400 })
    }

    // Find and modify the community_insights section
    const article = row.article
    if (!article?.sections || !Array.isArray(article.sections)) {
      return Response.json({ error: 'Article has no sections' }, { status: 400 })
    }

    const sectionIdx = article.sections.findIndex(
      (s: { type: string }) => s.type === 'community_insights'
    )
    if (sectionIdx === -1) {
      return Response.json({ error: 'No community insights section found' }, { status: 404 })
    }

    const section = article.sections[sectionIdx]

    if (type === 'quote') {
      if (!Array.isArray(section.quotes) || index >= section.quotes.length) {
        return Response.json({ error: 'Quote index out of range' }, { status: 400 })
      }
      section.quotes.splice(index, 1)
    } else if (type === 'insight') {
      if (!Array.isArray(section.insights) || index >= section.insights.length) {
        return Response.json({ error: 'Insight index out of range' }, { status: 400 })
      }
      section.insights.splice(index, 1)
    } else {
      return Response.json({ error: 'Invalid type: must be quote or insight' }, { status: 400 })
    }

    // If all quotes AND insights are removed, remove the entire section
    const hasContent = (section.quotes?.length > 0) || (section.insights?.length > 0)
    if (!hasContent) {
      article.sections.splice(sectionIdx, 1)
    } else {
      article.sections[sectionIdx] = section
    }

    // Save
    const { error: updateErr } = await db
      .from('articles')
      .update({ article })
      .eq('id', id)

    if (updateErr) {
      console.error('[remove-quote] Update failed:', updateErr.message)
      return Response.json({ error: 'Failed to update article' }, { status: 500 })
    }

    // Count remaining reddit research findings for toast hint
    let availableRedditFindings = 0
    try {
      const { data: fullRow } = await db
        .from('articles')
        .select('research_preview')
        .eq('id', id)
        .single()
      const rp = fullRow?.research_preview
      if (rp?.redditThreads) {
        availableRedditFindings = rp.redditThreads.length
      }
    } catch { /* ignore */ }

    return Response.json({
      success: true,
      article,
      availableRedditFindings,
    })
  } catch (err) {
    console.error('[remove-quote] Error:', err)
    return Response.json({ error: 'Failed to remove quote' }, { status: 500 })
  }
}
