import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const body = await request.json()
  const { is_featured, featured_position } = body

  if (typeof is_featured !== 'boolean') {
    return Response.json({ error: 'is_featured (boolean) is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const update: Record<string, unknown> = { is_featured }

  if (is_featured && typeof featured_position === 'number') {
    update.featured_position = featured_position
  } else if (!is_featured) {
    update.featured_position = null
  }

  const { error } = await db.from('articles').update(update).eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }

  // Generate card_summary in background when featuring an article
  if (is_featured) {
    generateCardSummary(id, db).catch(err => {
      console.error('[card-summary] Background generation failed:', err)
    })
  }

  return Response.json({ success: true, is_featured, featured_position: update.featured_position })
}

/**
 * Generate a punchy one-sentence card summary for the homepage hero card.
 * Only generates if card_summary is currently null/empty.
 * Uses Haiku for speed and cost efficiency.
 */
async function generateCardSummary(articleId: string, db: ReturnType<typeof getSupabaseAdmin>) {
  // Check if summary already exists
  const { data: row } = await db.from('articles').select('card_summary, article').eq('id', articleId).single()
  if (!row?.article) return
  if (row.card_summary && row.card_summary.trim().length > 0) return // Already has one

  const article = row.article as Record<string, unknown>
  const title = (article.title as string) ?? ''
  const articleType = (article.article_type as string) ?? ''
  const verdict = ((article.quick_verdict as Record<string, unknown>)?.recommendation as string)
    ?? ((article.quick_verdict as Record<string, unknown>)?.one_liner as string)
    ?? ''

  if (!title || !verdict) return

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[card-summary] No ANTHROPIC_API_KEY, skipping')
    return
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `You are writing a one-sentence summary for an article card on a homepage. It must be punchy, specific, and give a compelling reason to click. Maximum 20 words. Do not start with the article title. Do not use generic phrases like "this article covers" or "find out". Write the summary as a direct confident statement of the article's main finding or verdict.\n\nArticle title: ${title}\nArticle type: ${articleType}\nVerdict: ${verdict}`,
        }],
      }),
    })

    if (!res.ok) {
      console.error('[card-summary] API error:', res.status, await res.text())
      return
    }

    const data = await res.json()
    const summary = data.content?.[0]?.text?.trim()

    if (summary && summary.length > 0) {
      await db.from('articles').update({ card_summary: summary }).eq('id', articleId)
      console.log('[card-summary] Generated for', articleId.slice(0, 8) + ':', summary)
    }
  } catch (err) {
    console.error('[card-summary] Error:', err)
  }
}
