import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard, ImageSection } from '@/types/article'

interface BraveImageResult {
  properties: { url: string }
  thumbnail: { src: string }
}

const REJECTED_PATTERNS = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it|ytimg\.com|youtube\.com\/vi|i\.ytimg|img\.youtube|maxresdefault|hqdefault|mqdefault|sddefault|banner|screenshot|webpage|thumbnail/i

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
 * Shorten a long article title into a focused image search query.
 * e.g. "Top 6 Best-Selling Smartphones in 2024: Head-to-Head Comparison" → "Best-Selling Smartphones 2024"
 */
function shortenTitle(title: string): string {
  // Step 1: Take everything before the colon/pipe (these are usually subtitle separators)
  let short = title.split(/[:|]/)[0].trim()

  // Step 2: Remove filler words at the start
  short = short
    .replace(/^(the |a |an |your |our )/i, '')
    .replace(/\b(complete|ultimate|comprehensive|definitive)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Step 3: If still too long, take first 8 words
  const words = short.split(' ')
  if (words.length > 8) {
    short = words.slice(0, 8).join(' ')
  }

  return short
}

/**
 * Search for a high-quality thumbnail representing the article topic.
 * Shortens the title to get more relevant image results from Brave.
 */
export async function fetchThumbnailImage(
  title: string,
  articleType: ArticleType,
  excludeUrl?: string
): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  const shortTitle = shortenTitle(title)

  // Type-specific search hints
  const typeHints: Record<string, string> = {
    planning: 'travel photo',
    explainer: 'photo',
    trend_analysis: 'photo',
    news: 'photo',
    tutorial: 'photo',
    buyer_guide: 'products',
    comparison: 'products',
    decision_guide: 'photo',
  }
  const hint = typeHints[articleType] ?? 'photo'
  // Vary the query when replacing to get different results
  const modifiers = ['', 'high quality', 'professional', 'hero image', '2024']
  const modifier = excludeUrl ? modifiers[Math.floor(Math.random() * modifiers.length)] : ''
  const query = `${shortTitle} ${hint} ${modifier}`.trim()
  console.log('[thumbnail] Search query:', query)

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', '15')
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

    // Filter and pick the first good image that isn't the excluded one
    const filtered = filterAndRankImageUrls(results)
    if (excludeUrl) {
      return filtered.find((u) => u !== excludeUrl) ?? filtered[0] ?? null
    }
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
  const skipProductImages = imageDensity === 'none'
  const maxImages = skipProductImages ? 0 : getImageCount(article.article_type)

  // Build entity -> search_query map
  const entityMap = new Map(entities.map((e) => [e.name.toLowerCase(), e.search_query]))

  // Find all product cards (skip if image_density is "none")
  const productCards = skipProductImages
    ? []
    : article.sections.filter((s): s is ProductCard => s.type === 'product_card')

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

  // Find all image_section entries and fetch their images in parallel
  const imageSections = article.sections
    .map((s, idx) => ({ section: s, idx }))
    .filter((x): x is { section: ImageSection; idx: number } => x.section.type === 'image_section')

  const imageSectionResults = await Promise.all(
    imageSections.map(async ({ section, idx }) => {
      const enrichedImages = await Promise.all(
        section.images.map(async (img) => {
          if (!img.search_query) return img
          const urls = await fetchProductImages(img.search_query, 1)
          return { ...img, image_url: urls[0] ?? null }
        })
      )
      return { idx, enrichedImages }
    })
  )

  // Build index -> enriched images map
  const imageSectionMap = new Map(imageSectionResults.map((r) => [r.idx, r.enrichedImages]))

  // Merge image URLs into sections
  const enrichedSections = article.sections.map((section, idx) => {
    if (section.type === 'product_card') {
      const urls = imageMap.get(section.entity_name) ?? []
      return {
        ...section,
        image_url: urls[0] ?? null,
        image_urls: urls,
      }
    }
    if (section.type === 'image_section' && imageSectionMap.has(idx)) {
      return {
        ...section,
        images: imageSectionMap.get(idx)!,
      }
    }
    return section
  })

  return { ...article, sections: enrichedSections }
}
