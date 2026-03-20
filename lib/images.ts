import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard } from '@/types/article'

interface BraveImageResult {
  properties: { url: string }
  thumbnail: { src: string }
}

const REJECTED_PATTERNS = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it/i

// Official/reputable product image sources — these get priority
const PREFERRED_HOSTNAMES = new Set([
  'images-na.ssl-images-amazon.com', 'm.media-amazon.com',
  'store.storeimages.cdn-apple.com', 'image-us.samsung.com',
  'pisces.bbystatic.com', // Best Buy
  'i5.walmartimages.com',
  'cdn.shopify.com',
  'static.bhphoto.com',
])

function filterAndRankImageUrls(results: BraveImageResult[]): string[] {
  const seen = new Set<string>()
  const preferred: string[] = []
  const others: string[] = []

  for (const r of results) {
    const url = r.properties?.url
    if (!url) continue
    if (REJECTED_PATTERNS.test(url)) continue
    if (url.length < 30) continue

    // Deduplicate by hostname
    let hostname: string
    try {
      hostname = new URL(url).hostname
      if (seen.has(hostname)) continue
      seen.add(hostname)
    } catch {
      continue
    }

    // Sort into preferred vs others
    if (PREFERRED_HOSTNAMES.has(hostname)) {
      preferred.push(url)
    } else {
      others.push(url)
    }
  }

  // Preferred sources first, then the rest
  return [...preferred, ...others]
}

async function fetchProductImages(
  searchQuery: string,
  maxImages: number
): Promise<string[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', searchQuery)
    url.searchParams.set('count', '20')
    url.searchParams.set('safesearch', 'strict')

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results: BraveImageResult[] = data.results ?? []

    return filterAndRankImageUrls(results).slice(0, maxImages)
  } catch {
    return []
  }
}

function getImageCount(articleType: ArticleType): number {
  switch (articleType) {
    case 'buyer_guide':
    case 'comparison':
    case 'decision_guide':
      return 5
    default:
      return 3
  }
}

/**
 * Search for a high-quality landscape thumbnail representing the article topic.
 * Uses the article title + a "landscape photo" hint to bias towards editorial images.
 */
export async function fetchThumbnailImage(title: string, articleType: ArticleType): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  // Craft a search query that favours beautiful, editorial landscape images
  const typeHints: Record<string, string> = {
    planning: 'beautiful landscape photo',
    explainer: 'editorial photo',
    trend_analysis: 'editorial photo',
    news: 'editorial photo',
    tutorial: 'editorial photo',
    buyer_guide: 'product lineup photo',
    comparison: 'product comparison photo',
    decision_guide: 'photo',
  }
  const hint = typeHints[articleType] ?? 'photo'
  const query = `${title} ${hint}`

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', '8')
    url.searchParams.set('safesearch', 'strict')

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) return null

    const data = await res.json()
    const results: BraveImageResult[] = data.results ?? []

    // Filter and pick the first good landscape-oriented image
    const filtered = filterAndRankImageUrls(results)
    return filtered[0] ?? null
  } catch {
    return null
  }
}

export async function enrichArticleWithImages(
  article: ArticleContent,
  entities: PlanEntity[],
  imageDensity?: ImageDensity
): Promise<ArticleContent> {
  // Skip image enrichment entirely for articles with no image need
  if (imageDensity === 'none') {
    console.log('[images] Skipping image enrichment — image_density is "none"')
    return article
  }

  const maxImages = getImageCount(article.article_type)

  // Build entity -> search_query map
  const entityMap = new Map(entities.map((e) => [e.name.toLowerCase(), e.search_query]))

  // Find all product cards
  const productCards = article.sections.filter((s): s is ProductCard => s.type === 'product_card')

  // Fetch images in parallel
  const imageResults = await Promise.all(
    productCards.map(async (card) => {
      const baseQuery =
        entityMap.get(card.entity_name.toLowerCase()) ?? `${card.entity_name} product photo`
      const imageUrls = await fetchProductImages(baseQuery, maxImages)
      return { entity_name: card.entity_name, imageUrls }
    })
  )

  // Build name -> urls map
  const imageMap = new Map(imageResults.map((r) => [r.entity_name, r.imageUrls]))

  // Merge image URLs into sections
  const enrichedSections = article.sections.map((section) => {
    if (section.type === 'product_card') {
      const urls = imageMap.get(section.entity_name) ?? []
      return {
        ...section,
        image_url: urls[0] ?? null,
        image_urls: urls,
      }
    }
    return section
  })

  return { ...article, sections: enrichedSections }
}
