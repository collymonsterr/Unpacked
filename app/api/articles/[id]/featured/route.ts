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

  return Response.json({ success: true, is_featured, featured_position: update.featured_position })
}
