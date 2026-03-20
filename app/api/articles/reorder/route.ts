import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/articles/reorder
 * Body: { articleId: string, direction: 'up' | 'down' }
 *
 * Swaps the sort_order of two adjacent articles.
 * sort_order is stored in the article JSONB (no schema migration needed).
 */
export async function POST(request: NextRequest) {
  const { articleId, direction } = await request.json()

  if (!articleId || !['up', 'down'].includes(direction)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Fetch all complete articles in display order
  const { data: articles, error } = await db
    .from('articles')
    .select('id, article, pinned, created_at')
    .eq('status', 'complete')
    .order('pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !articles) {
    return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  // Build ordered list, respecting existing sort_order if set
  const ordered = articles
    .map((a) => ({
      id: a.id,
      sortOrder: a.article?.sort_order as number | undefined,
      pinned: a.pinned,
    }))
    .sort((a, b) => {
      // Pinned first
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // Then by sort_order (lower = higher position), nulls last
      const aOrder = a.sortOrder ?? 999
      const bOrder = b.sortOrder ?? 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return 0 // keep original order from DB
    })

  // Find current index
  const currentIdx = ordered.findIndex((a) => a.id === articleId)
  if (currentIdx === -1) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  // Find swap target
  const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
  if (swapIdx < 0 || swapIdx >= ordered.length) {
    return Response.json({ error: 'Already at boundary' }, { status: 400 })
  }

  // Assign sort_order values to all articles (re-index)
  const updates = ordered.map((a, i) => ({ id: a.id, sortOrder: i }))

  // Swap the two
  const tempOrder = updates[currentIdx].sortOrder
  updates[currentIdx].sortOrder = updates[swapIdx].sortOrder
  updates[swapIdx].sortOrder = tempOrder

  // Save sort_order into each article's JSONB
  await Promise.all(
    [updates[currentIdx], updates[swapIdx]].map(async (u) => {
      const { data: row } = await db
        .from('articles')
        .select('article')
        .eq('id', u.id)
        .single()
      if (row?.article) {
        const article = row.article as Record<string, unknown>
        article.sort_order = u.sortOrder
        await db.from('articles').update({ article }).eq('id', u.id)
      }
    })
  )

  return Response.json({ success: true })
}
