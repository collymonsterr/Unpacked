import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard } from '@/types/article'

interface BraveImageResult {
  properties: { url: string }
  thumbnail: { src: string }
}

const REJECTED_PATTERNS = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder/i

function filterImageUrls(results: BraveImageResult[]): string[] {
  const seen = new Set<string>()
  const filtered: string[] = []

  for (const r of results) {
    const url = r.properties?.url
    if (!url) continue
    if (REJECTED_PATTERNS.test(url)) continue
    if (url.length < 30) continue

    // Deduplicate by hostname
    try {
      const hostname = new URL(url).hostname
      if (seen.has(hostname)) continue
      seen.add(hostname)
    } catch {
      continue
    }

    filtered.push(url)
  }

  return filtered
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
    url.searchParams.set('count', '10')

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results: BraveImageResult[] = data.results ?? []

    return filterImageUrls(results).slice(0, maxImages)
  } catch {
    return []
  }
}

function getImageCount(articleType: ArticleType): number {
  switch (articleType) {
    case 'decision_guide':
      return 4
    case 'buyer_guide':
      return 2
    case 'comparison':
      return 2
    default:
      return 2
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
