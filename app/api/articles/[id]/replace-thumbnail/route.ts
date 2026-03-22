export const maxDuration = 120 // GPT Image can take 60+ seconds

import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { fetchThumbnailImage } from '@/lib/images'
import { generateHeroImage, pickBestArticleImage } from '@/lib/imagen'
import { requireArticleOwner } from '@/lib/auth-check'
import type { ArticleContent } from '@/types/article'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const useAI = request.nextUrl.searchParams.get('ai') === 'true'
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
  // Pick a specific image from history by index
  const pickIndex = request.nextUrl.searchParams.get('pick')

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent
  const history = article.thumbnail_history ?? []

  // If setting a specific URL (from preview Keep action)
  try {
    const body = await request.json().catch(() => null)
    if (body?.set_url) {
      // Save current to history, set new URL
      if (article.thumbnail_url && !history.includes(article.thumbnail_url)) {
        history.push(article.thumbnail_url)
      }
      article.thumbnail_url = body.set_url
      article.thumbnail_history = history
      await db.from('articles').update({ article }).eq('id', id)
      return Response.json({ article })
    }
  } catch {
    // Not JSON body, continue
  }

  // If picking from history, just set that URL as current
  if (pickIndex !== null) {
    const idx = parseInt(pickIndex, 10)
    if (idx >= 0 && idx < history.length) {
      article.thumbnail_url = history[idx]
      await db.from('articles').update({ article }).eq('id', id)
      return Response.json({ article })
    }
  }

  // Save current thumbnail to history before replacing
  if (article.thumbnail_url && !history.includes(article.thumbnail_url)) {
    history.push(article.thumbnail_url)
  }

  // Build list of all URLs the user has already seen
  const allSeenUrls = [...history]
  if (article.thumbnail_url) allSeenUrls.push(article.thumbnail_url)

  let newUrl: string | null = null

  // Use stored hero_image_query if available for smarter searches
  const heroQuery = (article as unknown as Record<string, unknown>).hero_image_query as string | undefined

  if (useAI) {
    newUrl = await generateHeroImage(article, id)
      ?? await fetchThumbnailImage(article.title, article.article_type, allSeenUrls, heroQuery)
      ?? pickBestArticleImage(article)
  } else {
    newUrl = await fetchThumbnailImage(article.title, article.article_type, allSeenUrls, heroQuery)
      ?? pickBestArticleImage(article)
  }

  // Preview mode — return URL without saving
  if (isPreview && newUrl) {
    return Response.json({ preview_url: newUrl })
  }

  // Add the new URL to history too
  if (newUrl && !history.includes(newUrl)) {
    history.push(newUrl)
  }

  article.thumbnail_url = newUrl
  article.thumbnail_history = history

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
