import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleContent, ProductCard, ImageSection } from '@/types/article'

const BRAVE_API = 'https://api.search.brave.com/res/v1/images/search'

const REJECTED = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it/i

async function searchImage(query: string, excludeUrls: string[]): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  try {
    const url = new URL(BRAVE_API)
    url.searchParams.set('q', query)
    url.searchParams.set('count', '15')
    url.searchParams.set('safesearch', 'strict')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    })
    if (!res.ok) return null

    const data = await res.json()
    const results: Array<{ properties?: { url?: string } }> = data.results ?? []

    const excludeSet = new Set(excludeUrls)

    for (const r of results) {
      const imgUrl = r.properties?.url
      if (!imgUrl) continue
      if (REJECTED.test(imgUrl)) continue
      if (imgUrl.length < 30) continue
      if (excludeSet.has(imgUrl)) continue
      return imgUrl
    }
    return null
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { sectionIndex, imageIndex } = await request.json()

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent
  const section = article.sections[sectionIndex]
  if (!section) return Response.json({ error: 'Invalid section' }, { status: 400 })

  // Collect current URLs to exclude from results
  const excludeUrls: string[] = []

  if (section.type === 'product_card') {
    const card = section as ProductCard
    const urls = card.image_urls ?? (card.image_url ? [card.image_url] : [])
    excludeUrls.push(...urls)

    // Remove the bad image — next image slides into its place
    const newUrls = [...urls]
    newUrls.splice(imageIndex, 1)

    // Search for a replacement and add it to the END of the array
    const baseName = card.entity_name
    const modifiers = ['official product photo', 'press image high resolution', 'review photo', 'product shot white background', 'unboxing']
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)]
    const query = `${baseName} ${modifier}`

    const newUrl = await searchImage(query, excludeUrls)
    if (newUrl) {
      newUrls.push(newUrl)
    }

    const updatedSection = {
      ...card,
      image_url: newUrls[0] ?? null,
      image_urls: newUrls,
    }
    article.sections[sectionIndex] = updatedSection
  } else if (section.type === 'image_section') {
    const imgSection = section as ImageSection
    const img = imgSection.images[imageIndex]
    if (!img) return Response.json({ error: 'Invalid image index' }, { status: 400 })

    excludeUrls.push(...imgSection.images.map((i) => i.image_url).filter(Boolean) as string[])

    const modifiers = ['beautiful photo', 'landscape photography', 'editorial stock photo', 'high quality photograph', 'professional photo']
    const modifier = modifiers[imageIndex % modifiers.length]
    const query = `${img.search_query} ${modifier}`

    const newUrl = await searchImage(query, excludeUrls)

    const updatedImages = [...imgSection.images]
    updatedImages[imageIndex] = { ...img, image_url: newUrl }

    article.sections[sectionIndex] = { ...imgSection, images: updatedImages }
  } else {
    return Response.json({ error: 'Section type not supported' }, { status: 400 })
  }

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
