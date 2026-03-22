import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const { hidden } = await request.json()

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
