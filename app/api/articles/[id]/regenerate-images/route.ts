import { NextRequest } from 'next/server'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 60

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  if (!row.article || !row.plan) {
    return Response.json({ error: 'Article not ready' }, { status: 400 })
  }

  try {
    const [enrichedArticle, thumbnailUrl] = await Promise.all([
      enrichArticleWithImages(row.article, row.plan.entities),
      fetchThumbnailImage(
        row.article.title,
        row.article.article_type,
        undefined,
        (row.article as unknown as Record<string, unknown>).hero_image_query as string | undefined,
        row.article.quick_verdict?.one_liner ?? row.article.executive_summary?.short_answer ?? '',
        id
      ),
    ])

    enrichedArticle.thumbnail_url = thumbnailUrl

    await db
      .from('articles')
      .update({ article: enrichedArticle })
      .eq('id', id)

    return Response.json({ article: enrichedArticle })
  } catch (err) {
    console.error('[regenerate-images]', err)
    return Response.json({ error: 'Image regeneration failed' }, { status: 500 })
  }
}
