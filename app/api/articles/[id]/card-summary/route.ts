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
  const { card_summary } = body

  if (typeof card_summary !== 'string') {
    return Response.json({ error: 'card_summary (string) is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('articles')
    .update({ card_summary: card_summary.trim() || null })
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }

  return Response.json({ success: true })
}
