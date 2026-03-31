import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'
import { ARTICLE_TYPE_LIST } from '@/lib/article-types'

const VALID_TYPES = ARTICLE_TYPE_LIST as readonly string[]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const { article_type } = await request.json()

  if (!article_type || !VALID_TYPES.includes(article_type)) {
    return Response.json({ error: 'Invalid article type' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()

  if (!row?.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = row.article as Record<string, unknown>
  article.article_type = article_type

  const { error } = await db.from('articles').update({ article }).eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }

  return Response.json({ success: true })
}
