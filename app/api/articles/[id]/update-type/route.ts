import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'

const VALID_TYPES = ['buyer_guide', 'comparison', 'decision_guide', 'explainer', 'news', 'planning', 'trend_analysis', 'tutorial']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireArticleOwner(id)
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
