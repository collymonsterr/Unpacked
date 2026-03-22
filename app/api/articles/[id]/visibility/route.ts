import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID, parseBody } from '@/lib/validate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const body = await parseBody(request)
  if (!body || typeof body.hidden !== 'boolean') {
    return Response.json({ error: 'hidden (boolean) is required' }, { status: 400 })
  }
  const hidden = body.hidden

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()

  if (!row?.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = row.article as Record<string, unknown>
  article.hidden_from_homepage = !!hidden

  const { error } = await db.from('articles').update({ article }).eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }

  return Response.json({ success: true, hidden: !!hidden })
}
