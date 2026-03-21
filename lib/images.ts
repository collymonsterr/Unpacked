import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard, ImageSection } from '@/types/article'

interface BraveImageResult {
  properties: { url: string }
  thumbnail: { src: string }
}

const REJECTED_PATTERNS = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it|ytimg\.com|youtube\.com\/vi|i\.ytimg|img\.youtube|maxresdefault|hqdefault|mqdefault|sddefault|banner|screenshot|webpage|thumbnail|clipart|cartoon|illustration|vector|stock|watermark|shutterstock|istockphoto|gettyimages|dreamstime|depositphotos|123rf|fotolia|alamy/i

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

function getImageCount(articleType: ArticleType, productType?: string): number {
  // Software, services, and places don't need multiple images
  if (productType === 'software') return 1
  if (productType === 'service') return 2
  if (productType === 'place') return 2

  // Physical products benefit from multiple angles
  switch (articleType) {
    case 'buyer_guide':
    case 'comparison':
    case 'decision_guide':
      return 3
    default:
      return 2
  }
}

/**
 * Shorten a long article title into a focused image search query.
 * Keeps the essential topic words (especially proper nouns and key subjects)
 * while stripping generic article framing words.
 */
function shortenTitle(title: string): string {
  // Remove generic subtitle suffixes (after colon/pipe) BUT only if the first
  // part is substantial enough on its own (> 20 chars). Otherwise keep the full title
  // because the key subject might be after the colon (e.g. "Holiday in Dubai: The Ultimate Itinerary")
  let short = title
  const colonIdx = title.search(/[:|]/)
  if (colonIdx > 20) {
    short = title.substring(0, colonIdx).trim()
  }

  // Remove generic article framing words (but keep proper nouns, numbers, product names)
  short = short
    .replace(/^(the |a |an |your |our )/i, '')
    .replace(/\b(complete|ultimate|comprehensive|definitive)\b/gi, '')
    .replace(/\b(guide|review|comparison|roundup|breakdown|overview|recommendations?)\b/gi, '')
    .replace(/[&]/g, 'and')
    .replace(/\s+/g, ' ')
    .replace(/^\W+/, '') // Remove leading non-word chars (dashes, etc.)
    .trim()

  // If still too long, take first 10 words
  const words = short.split(' ')
  if (words.length > 10) {
    short = words.slice(0, 10).join(' ')
  }

  // Safety: if we stripped too much, fall back to original title (first 10 words)
  if (short.length < 8) {
    short = title.replace(/\s+/g, ' ').trim().split(' ').slice(0, 10).join(' ')
  }

  return short
}

/**
 * Search for a high-quality thumbnail representing the article topic.
 * Shortens the title to get more relevant image results from Brave.
 *
 * Pass `excludeUrls` to avoid repeating images the user has already seen.
 * Each call with excludeUrls uses a different search angle to maximise variety.
 */
export async function fetchThumbnailImage(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[]
): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  const shortTitle = shortenTitle(title)
  const isReplacing = excludeUrls && excludeUrls.length > 0

  // Different search angles to get genuinely different results each time
  const searchAngles: Array<{ hint: string; modifier: string }> = (() => {
    const base: Record<string, Array<{ hint: string; modifier: string }>> = {
      planning: [
        { hint: 'travel photography', modifier: '' },
        { hint: 'aerial view', modifier: '' },
        { hint: 'landscape beautiful', modifier: '' },
        { hint: 'street photography', modifier: '' },
        { hint: 'destination guide', modifier: 'editorial' },
        { hint: 'scenic view', modifier: '4k' },
        { hint: 'travel blog', modifier: '' },
        { hint: 'wanderlust', modifier: 'HD' },
      ],
      explainer: [
        { hint: 'photo', modifier: '' },
        { hint: 'illustration', modifier: 'editorial' },
        { hint: 'concept', modifier: 'high quality' },
        { hint: 'infographic visual', modifier: '' },
        { hint: 'technology', modifier: 'professional' },
        { hint: 'abstract', modifier: 'modern' },
      ],
      buyer_guide: [
        { hint: 'products lineup', modifier: '' },
        { hint: 'product photography', modifier: 'studio' },
        { hint: 'flatlay', modifier: '' },
        { hint: 'lifestyle', modifier: '' },
        { hint: 'product review', modifier: 'editorial' },
        { hint: 'collection', modifier: 'aesthetic' },
      ],
      comparison: [
        { hint: 'products comparison', modifier: '' },
        { hint: 'product photography', modifier: '' },
        { hint: 'side by side', modifier: '' },
        { hint: 'review roundup', modifier: '' },
        { hint: 'product lineup', modifier: 'editorial' },
        { hint: 'studio shot', modifier: '' },
      ],
    }
    return base[articleType] ?? [
      { hint: 'photo', modifier: '' },
      { hint: 'photography', modifier: 'editorial' },
      { hint: 'high quality photo', modifier: '' },
      { hint: 'professional', modifier: '' },
      { hint: 'visual', modifier: 'HD' },
      { hint: 'aesthetic', modifier: '' },
    ]
  })()

  // Pick the search angle based on how many images have been excluded
  // This ensures each "New photo" click uses a different search
  const angleIndex = isReplacing ? excludeUrls.length % searchAngles.length : 0
  const angle = searchAngles[angleIndex]
  const query = `${shortTitle} ${angle.hint} ${angle.modifier}`.trim()
  console.log('[thumbnail] Search query:', query, `(angle ${angleIndex}/${searchAngles.length})`)

  const excludeSet = new Set(excludeUrls ?? [])

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', '20') // Fetch more to have options after filtering
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

    // Filter, rank, and exclude already-seen URLs
    const filtered = filterAndRankImageUrls(results)
      .filter((u) => !excludeSet.has(u))

    return filtered[0] ?? null
  } catch {
    return null
  }
}

/**
 * Returns a search hint based on product type to improve image relevance.
 * e.g. "motorcycle" for a physical product named "Kawasaki ZX-10R"
 */
function getProductTypeHint(productType?: string): string {
  switch (productType) {
    case 'software': return 'app screenshot logo'
    case 'service': return 'official website'
    case 'place': return 'photo'
    default: return 'official product photo'
  }
}

export async function enrichArticleWithImages(
  article: ArticleContent,
  entities: PlanEntity[],
  imageDensity?: ImageDensity
): Promise<ArticleContent> {
  const skipProductImages = imageDensity === 'none'

  // Build entity -> search_query map
  const entityMap = new Map(entities.map((e) => [e.name.toLowerCase(), e.search_query]))

  // Find all product cards (skip if image_density is "none")
  const productCards = skipProductImages
    ? []
    : article.sections.filter((s): s is ProductCard => s.type === 'product_card')

  // Fetch images in parallel — image count varies per product type
  const imageResults = await Promise.all(
    productCards.map(async (card) => {
      const maxImages = getImageCount(article.article_type, card.product_type)
      const planQuery = entityMap.get(card.entity_name.toLowerCase())
      // Build a search query that includes the product type for better relevance
      const typeHint = getProductTypeHint(card.product_type)
      const baseQuery = planQuery
        ? (typeHint && !planQuery.toLowerCase().includes(typeHint.toLowerCase())
          ? `${planQuery} ${typeHint}`
          : planQuery)
        : `${card.entity_name} ${typeHint || 'product photo'}`
      console.log(`[images] Searching for "${card.entity_name}": "${baseQuery}"`)
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
