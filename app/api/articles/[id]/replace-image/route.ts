import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID, isNonNegativeInt } from '@/lib/validate'
import type { ArticleContent, ProductCard, ImageSection } from '@/types/article'

const BRAVE_API = 'https://api.search.brave.com/res/v1/images/search'

const REJECTED = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it|clipart|cartoon|illustration|vector|watermark|shutterstock|istockphoto|gettyimages|dreamstime|depositphotos/i

const SMALL_IMAGE_PATTERNS = /\/thumb\/|\/small\/|\/s\/|_thumb\.|_small\.|_icon\.|_mini\.|\/64\/|\/96\/|\/128\/|\/150\/|\/100x|\/120x|\/150x|\/160x|\/200x|w_150|w_200|h_150|h_200|size=small|size=thumb/i

const MIN_IMAGE_WIDTH = 400
const MIN_IMAGE_HEIGHT = 300

async function searchImages(query: string, excludeUrls: Set<string>, count: number = 20): Promise<string[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL(BRAVE_API)
    url.searchParams.set('q', query)
    url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', 'strict')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results: Array<{
      properties?: { url?: string }
      thumbnail?: { src?: string; width?: number; height?: number }
      meta_url?: { width?: number; height?: number }
    }> = data.results ?? []
    const found: string[] = []
    const seenHosts = new Set<string>()

    for (const r of results) {
      const imgUrl = r.properties?.url
      if (!imgUrl) continue
      if (REJECTED.test(imgUrl)) continue
      if (SMALL_IMAGE_PATTERNS.test(imgUrl)) continue
      if (imgUrl.length < 30) continue
      if (excludeUrls.has(imgUrl)) continue

      const width = r.thumbnail?.width ?? r.meta_url?.width
      const height = r.thumbnail?.height ?? r.meta_url?.height
      if (width && width < MIN_IMAGE_WIDTH) continue
      if (height && height < MIN_IMAGE_HEIGHT) continue

      try {
        const host = new URL(imgUrl).hostname
        if (seenHosts.has(host)) continue
        seenHosts.add(host)
      } catch { continue }
      found.push(imgUrl)
    }
    return found
  } catch {
    return []
  }
}

// Neutral query modifiers for product searches
const PRODUCT_SUFFIXES = ['', 'photo', 'review', 'closeup']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const body = await request.json()
  const { sectionIndex, imageIndex, preview, count, selected_url, extra_exclude } = body

  if (!isNonNegativeInt(sectionIndex) || !isNonNegativeInt(imageIndex)) {
    return Response.json({ error: 'sectionIndex and imageIndex must be non-negative integers' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent & { _used_image_urls?: string[] }
  const section = article.sections[sectionIndex]
  if (!section) return Response.json({ error: 'Invalid section' }, { status: 400 })

  // Build exclusion set
  const usedUrls: Set<string> = new Set(article._used_image_urls ?? [])

  // Exclude all current images in this section
  if (section.type === 'product_card') {
    const card = section as ProductCard
    const urls = card.image_urls ?? (card.image_url ? [card.image_url] : [])
    urls.forEach(u => usedUrls.add(u))
  } else if (section.type === 'image_section') {
    const imgSection = section as ImageSection
    imgSection.images.forEach(i => { if (i.image_url) usedUrls.add(i.image_url) })
  }

  // Add extra_exclude from "Search again" flow
  if (Array.isArray(extra_exclude)) {
    extra_exclude.forEach((u: string) => usedUrls.add(u))
  }

  // ═══ MODE 1: Preview — return candidate URLs without saving ═══
  if (preview) {
    const resultCount = Math.min(Math.max(count || 4, 1), 10)
    let searchName = ''

    if (section.type === 'product_card') {
      searchName = (section as ProductCard).entity_name
    } else if (section.type === 'image_section') {
      const img = (section as ImageSection).images[imageIndex]
      searchName = img?.search_query ?? ''
    }

    if (!searchName) {
      return Response.json({ preview_urls: [] })
    }

    // Search with a suffix rotation based on exclude count for variety
    const suffixIdx = (usedUrls.size) % PRODUCT_SUFFIXES.length
    const suffix = PRODUCT_SUFFIXES[suffixIdx]
    const query = suffix ? `${searchName} ${suffix}` : searchName
    console.log(`[replace-image preview] "${query}" (excluding ${usedUrls.size} URLs, want ${resultCount})`)

    const candidates = await searchImages(query, usedUrls, 20)
    return Response.json({ preview_urls: candidates.slice(0, resultCount) })
  }

  // ═══ MODE 2: Select — save a specific URL to the image slot ═══
  if (selected_url && typeof selected_url === 'string') {
    if (section.type === 'product_card') {
      const card = section as ProductCard
      const urls = [...(card.image_urls ?? (card.image_url ? [card.image_url] : []))]

      // Replace the specific slot
      if (imageIndex >= 0 && imageIndex < urls.length) {
        const oldUrl = urls[imageIndex]
        if (oldUrl) usedUrls.add(oldUrl)
        urls[imageIndex] = selected_url
      } else {
        // Append if index is beyond current array
        urls.push(selected_url)
      }

      usedUrls.add(selected_url)

      article.sections[sectionIndex] = {
        ...card,
        image_url: urls[0] ?? null,
        image_urls: urls,
      }
    } else if (section.type === 'image_section') {
      const imgSection = section as ImageSection
      const img = imgSection.images[imageIndex]
      if (!img) return Response.json({ error: 'Invalid image index' }, { status: 400 })

      if (img.image_url) usedUrls.add(img.image_url)
      usedUrls.add(selected_url)

      const updatedImages = [...imgSection.images]
      updatedImages[imageIndex] = { ...img, image_url: selected_url }
      article.sections[sectionIndex] = { ...imgSection, images: updatedImages }
    } else {
      return Response.json({ error: 'Section type not supported' }, { status: 400 })
    }

    article._used_image_urls = Array.from(usedUrls)
    await db.from('articles').update({ article }).eq('id', id)
    return Response.json({ article })
  }

  return Response.json({ error: 'Must provide either preview:true or selected_url' }, { status: 400 })
}
