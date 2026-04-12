import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

/**
 * POST /api/articles/reorder
 * Body: { orderedIds: string[] }
 *
 * Sets sort_order for all articles based on their position in the array.
 */
export async function POST(request: NextRequest) {
  try {
    // Reorder is admin-only
    const auth = await requireAdmin()
    if (!auth.authorized) return auth.error!

    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return Response.json({ error: 'orderedIds array required' }, { status: 400 })
    }

    if (orderedIds.some((id: unknown) => typeof id !== 'string' || !isValidUUID(id as string))) {
      return Response.json({ error: 'All orderedIds must be valid UUIDs' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    // Update sort_order column directly
    await Promise.all(
      orderedIds.map(async (id: string, index: number) => {
        await db.from('articles').update({ sort_order: index }).eq('id', id)
      })
    )

    return Response.json({ success: true })
  } catch (err) {
    console.error('[articles-reorder]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
