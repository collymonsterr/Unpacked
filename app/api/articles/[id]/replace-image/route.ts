import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID, isNonNegativeInt } from '@/lib/validate'
import type { ArticleContent, ProductCard, ImageSection } from '@/types/article'

const BRAVE_API = 'https://api.search.brave.com/res/v1/images/search'

const REJECTED = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it|clipart|cartoon|illustration|vector|watermark|shutterstock|istockphoto|gettyimages|dreamstime|depositphotos/i

// Reject images that are obviously too small based on URL patterns
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

      // Check dimensions if available from Brave metadata
      const width = r.thumbnail?.width ?? r.meta_url?.width
      const height = r.thumbnail?.height ?? r.meta_url?.height
      if (width && width < MIN_IMAGE_WIDTH) continue
      if (height && height < MIN_IMAGE_HEIGHT) continue

      // Deduplicate by hostname
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

// Different query variations to get genuinely different images each time
const PRODUCT_MODIFIERS = [
  'official product photo',
  'press image high resolution',
  'review photo hands on',
  'product shot white background',
  'unboxing first look',
  'studio photography',
  'lifestyle product photo',
  'closeup detail shot',
  'comparison photo side by side',
  'professional review image',
  'editorial product photography',
  'retail store display photo',
]

const EDITORIAL_MODIFIERS = [
  'beautiful photo',
  'landscape photography',
  'editorial photograph',
  'high quality photograph',
  'professional photo',
  'aerial view photo',
  'street photography',
  'cinematic photograph',
  'travel photography',
  'documentary photo',
  'award winning photography',
  'panoramic view',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const { sectionIndex, imageIndex } = await request.json()
  if (!isNonNegativeInt(sectionIndex) || !isNonNegativeInt(imageIndex)) {
    return Response.json({ error: 'sectionIndex and imageIndex must be non-negative integers' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent & { _used_image_urls?: string[] }
  const section = article.sections[sectionIndex]
  if (!section) return Response.json({ error: 'Invalid section' }, { status: 400 })

  // Track ALL previously used URLs to never repeat
  const usedUrls: Set<string> = new Set(article._used_image_urls ?? [])

  // Also exclude all current images in this section
  if (section.type === 'product_card') {
    const card = section as ProductCard
    const urls = card.image_urls ?? (card.image_url ? [card.image_url] : [])
    urls.forEach(u => usedUrls.add(u))
  } else if (section.type === 'image_section') {
    const imgSection = section as ImageSection
    imgSection.images.forEach(i => { if (i.image_url) usedUrls.add(i.image_url) })
  }

  if (section.type === 'product_card') {
    const card = section as ProductCard
    const urls = card.image_urls ?? (card.image_url ? [card.image_url] : [])

    // Remove the clicked image
    const newUrls = [...urls]
    const removedUrl = newUrls.splice(imageIndex, 1)[0]
    if (removedUrl) usedUrls.add(removedUrl)

    // Try multiple query variations until we find a new image
    const baseName = card.entity_name
    const shuffledMods = [...PRODUCT_MODIFIERS].sort(() => Math.random() - 0.5)
    let newUrl: string | null = null

    for (const modifier of shuffledMods.slice(0, 4)) {
      const query = `${baseName} ${modifier}`
      console.log(`[replace-image] Searching: "${query}" (excluding ${usedUrls.size} URLs)`)
      const candidates = await searchImages(query, usedUrls)
      if (candidates.length > 0) {
        newUrl = candidates[0]
        break
      }
    }

    if (newUrl) {
      newUrls.push(newUrl)
      usedUrls.add(newUrl)
    }

    article.sections[sectionIndex] = {
      ...card,
      image_url: newUrls[0] ?? null,
      image_urls: newUrls,
    }
  } else if (section.type === 'image_section') {
    const imgSection = section as ImageSection
    const img = imgSection.images[imageIndex]
    if (!img) return Response.json({ error: 'Invalid image index' }, { status: 400 })

    if (img.image_url) usedUrls.add(img.image_url)

    const shuffledMods = [...EDITORIAL_MODIFIERS].sort(() => Math.random() - 0.5)
    let newUrl: string | null = null

    for (const modifier of shuffledMods.slice(0, 4)) {
      const query = `${img.search_query} ${modifier}`
      console.log(`[replace-image] Searching: "${query}" (excluding ${usedUrls.size} URLs)`)
      const candidates = await searchImages(query, usedUrls)
      if (candidates.length > 0) {
        newUrl = candidates[0]
        break
      }
    }

    if (newUrl) usedUrls.add(newUrl)

    const updatedImages = [...imgSection.images]
    updatedImages[imageIndex] = { ...img, image_url: newUrl }
    article.sections[sectionIndex] = { ...imgSection, images: updatedImages }
  } else {
    return Response.json({ error: 'Section type not supported' }, { status: 400 })
  }

  // Persist the used URLs list so future replacements never repeat
  article._used_image_urls = Array.from(usedUrls)

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
