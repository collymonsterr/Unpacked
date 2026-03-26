export const maxDuration = 120 // GPT Image can take 60+ seconds

import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { fetchThumbnailImage, fetchMultipleThumbnailImages } from '@/lib/images'
import { generateHeroImage, pickBestArticleImage } from '@/lib/imagen'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'
import type { ArticleContent } from '@/types/article'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const useAI = request.nextUrl.searchParams.get('ai') === 'true'
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
  const countParam = request.nextUrl.searchParams.get('count')
  const count = countParam ? Math.min(Math.max(parseInt(countParam, 10) || 1, 1), 10) : 1
  const pickIndex = request.nextUrl.searchParams.get('pick')

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent
  const history = article.thumbnail_history ?? []
  const summary = article.quick_verdict?.one_liner ?? article.executive_summary?.short_answer ?? ''

  // If setting a specific URL directly (from grid picker select)
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

    // If extra exclude URLs are passed from the picker's "Search again"
    if (body?.extra_exclude && Array.isArray(body.extra_exclude)) {
      // These are URLs the picker has already shown — exclude them from this search
      const extraExclude = body.extra_exclude as string[]
      const allSeenUrls = [...history]
      if (article.thumbnail_url) allSeenUrls.push(article.thumbnail_url)
      allSeenUrls.push(...extraExclude)

      const heroQuery = (article as unknown as Record<string, unknown>).hero_image_query as string | undefined

      if (isPreview && count > 1) {
        const urls = await fetchMultipleThumbnailImages(
          article.title, article.article_type, allSeenUrls, heroQuery, count, summary, id
        )
        return Response.json({ preview_urls: urls })
      }
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

  // Build list of all URLs the user has already seen
  const allSeenUrls = [...history]
  if (article.thumbnail_url) allSeenUrls.push(article.thumbnail_url)

  const heroQuery = (article as unknown as Record<string, unknown>).hero_image_query as string | undefined

  // Multi-image preview mode — return array of URLs without saving
  if (isPreview && count > 1 && !useAI) {
    const urls = await fetchMultipleThumbnailImages(
      article.title, article.article_type, allSeenUrls, heroQuery, count, summary, id
    )
    return Response.json({ preview_urls: urls })
  }

  // Single-image flows (AI generation, single preview, direct save)
  let newUrl: string | null = null

  if (useAI) {
    newUrl = await generateHeroImage(article, id)
      ?? await fetchThumbnailImage(article.title, article.article_type, allSeenUrls, heroQuery, summary, id)
      ?? pickBestArticleImage(article)
  } else {
    newUrl = await fetchThumbnailImage(article.title, article.article_type, allSeenUrls, heroQuery, summary, id)
      ?? pickBestArticleImage(article)
  }

  // Single preview mode — return URL without saving
  if (isPreview && newUrl) {
    return Response.json({ preview_url: newUrl })
  }

  // Save current thumbnail to history before replacing
  if (article.thumbnail_url && !history.includes(article.thumbnail_url)) {
    history.push(article.thumbnail_url)
  }

  if (newUrl && !history.includes(newUrl)) {
    history.push(newUrl)
  }

  article.thumbnail_url = newUrl
  article.thumbnail_history = history

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
