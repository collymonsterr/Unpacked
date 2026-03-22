import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

/**
 * POST /api/articles/reorder
 * Body: { orderedIds: string[] }
 *
 * Sets sort_order for all articles based on their position in the array.
 * sort_order is stored in the article JSONB (no schema migration needed).
 */
export async function POST(request: NextRequest) {
  // Reorder is an admin action — require authentication
  const auth = await requireAuth()
  if (!auth.authorized) return auth.error!

  const { orderedIds } = await request.json()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return Response.json({ error: 'orderedIds array required' }, { status: 400 })
  }

  if (orderedIds.some((id: unknown) => typeof id !== 'string' || !isValidUUID(id as string))) {
    return Response.json({ error: 'All orderedIds must be valid UUIDs' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Update sort_order for each article
  await Promise.all(
    orderedIds.map(async (id: string, index: number) => {
      const { data: row } = await db
        .from('articles')
        .select('article')
        .eq('id', id)
        .single()

      if (row?.article) {
        const article = row.article as Record<string, unknown>
        article.sort_order = index
        await db.from('articles').update({ article }).eq('id', id)
      }
    })
  )

  return Response.json({ success: true })
}
