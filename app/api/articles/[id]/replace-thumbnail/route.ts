import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { fetchThumbnailImage } from '@/lib/images'
import { generateHeroImage, pickBestArticleImage } from '@/lib/imagen'
import type { ArticleContent } from '@/types/article'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const useAI = request.nextUrl.searchParams.get('ai') === 'true'

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent

  let newUrl: string | null = null

  if (useAI) {
    // AI-generated → Brave → best article image
    newUrl = await generateHeroImage(article, id)
      ?? await fetchThumbnailImage(article.title, article.article_type, article.thumbnail_url ?? undefined)
      ?? pickBestArticleImage(article)
  } else {
    // Brave search → best article image (default — more natural looking)
    newUrl = await fetchThumbnailImage(article.title, article.article_type, article.thumbnail_url ?? undefined)
      ?? pickBestArticleImage(article)
  }

  article.thumbnail_url = newUrl

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
