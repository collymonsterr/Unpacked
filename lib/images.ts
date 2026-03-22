import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard, ImageSection } from '@/types/article'

interface BraveImageResult {
  properties: { url: string }
  thumbnail: { src: string; width?: number; height?: number }
  title?: string
  width?: number
  height?: number
}

const REJECTED_PATTERNS = /\.svg|\.gif|favicon|icon|logo|pixel|tracking|badge|sprite|placeholder|avatar|profile|thumbs\.redditmedia|external-preview\.redd\.it|preview\.redd\.it|ytimg\.com|youtube\.com\/vi|i\.ytimg|img\.youtube|maxresdefault|hqdefault|mqdefault|sddefault|banner|screenshot|webpage|thumbnail|clipart|cartoon|illustration|vector|stock|watermark|shutterstock|istockphoto|gettyimages|dreamstime|depositphotos|123rf|fotolia|alamy/i

const SMALL_IMAGE_PATTERNS = /\/thumb\/|\/small\/|\/s\/|_thumb\.|_small\.|_icon\.|_mini\.|\/64\/|\/96\/|\/128\/|\/150\/|\/100x|\/120x|\/150x|\/160x|\/200x|w_150|w_200|h_150|h_200|size=small|size=thumb/i

// Reject images that are likely infographics, charts with text, or text-heavy images
const TEXT_IMAGE_PATTERNS = /infographic|chart|diagram|template|checklist|worksheet|printable|slide|presentation|powerpoint|canva\.com|venngage|piktochart|visme|lucidchart/i

// Official/reputable product image sources — these get priority
const PREFERRED_HOSTNAMES = new Set([
  'images-na.ssl-images-amazon.com', 'm.media-amazon.com',
  'store.storeimages.cdn-apple.com', 'image-us.samsung.com',
  'pisces.bbystatic.com', // Best Buy
  'i5.walmartimages.com',
  'cdn.shopify.com',
  'static.bhphoto.com',
  'images.unsplash.com', // Unsplash — high quality stock
  'plus.unsplash.com',
])

function filterAndRankImageUrls(results: BraveImageResult[], allowDuplicateHosts = false): string[] {
  const seen = new Set<string>()
  const preferred: string[] = []
  const others: string[] = []

  for (const r of results) {
    const url = r.properties?.url
    if (!url) continue
    if (REJECTED_PATTERNS.test(url)) continue
    if (SMALL_IMAGE_PATTERNS.test(url)) continue
    if (TEXT_IMAGE_PATTERNS.test(url)) continue
    if (url.length < 30) continue

    // Skip tiny images based on metadata
    if (r.width && r.width < 400) continue
    if (r.height && r.height < 300) continue

    // Skip images with comparison/infographic titles
    const title = (r.title || '').toLowerCase()
    if (title.includes(' vs ') || title.includes('comparison') || title.includes('infographic')) continue

    // Deduplicate by hostname (unless allowing duplicates for product searches)
    let hostname: string
    try {
      hostname = new URL(url).hostname
      if (!allowDuplicateHosts) {
        if (seen.has(hostname)) continue
      }
      // Always deduplicate exact URLs
      if (seen.has(url)) continue
      seen.add(hostname)
      seen.add(url)
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

async function searchBraveImages(query: string, count = 20): Promise<BraveImageResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', 'strict')

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) return []

    const data = await res.json()
    return data.results ?? []
  } catch {
    return []
  }
}

async function fetchProductImages(
  searchQuery: string,
  maxImages: number,
  entityName?: string
): Promise<string[]> {
  // Primary search
  const primaryResults = await searchBraveImages(searchQuery, 20)

  // Secondary search with a variation for more variety
  let secondaryResults: BraveImageResult[] = []
  if (maxImages > 2 && entityName) {
    const secondaryQuery = `${entityName} review photo high quality`
    secondaryResults = await searchBraveImages(secondaryQuery, 10)
  }

  // Combine, filter, and deduplicate — allow multiple from same host for product images
  const allResults = [...primaryResults, ...secondaryResults]
  return filterAndRankImageUrls(allResults, true).slice(0, maxImages)
}

function getImageCount(articleType: ArticleType, productType?: string): number {
  // Software, services, and places don't need multiple images
  if (productType === 'software') return 1
  if (productType === 'service') return 2
  if (productType === 'place') return 3

  // Physical products get 5 images for a proper gallery
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
    .replace(/\b(complete|ultimate|comprehensive|definitive|real|actual|hidden|true)\b/gi, '')
    .replace(/\b(guide|review|comparison|roundup|breakdown|overview|recommendations?|analysis|assessment)\b/gi, '')
    // Strip trailing context phrases like "for large apartments and houses", "when traditional advice doesn't"
    .replace(/\b(for|when|that|if|in|on|at)\b\s+.{0,40}$/i, '')
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
/**
 * Map article topics to visual subjects for hero image search.
 * The key insight: search for what the article is ABOUT, not the article title.
 * "Rent vs Buy" → "beautiful modern house" not "rent vs buy guide"
 */
function getHeroSubject(title: string, articleType: ArticleType): string {
  const t = title.toLowerCase()

  // Topic-specific mappings
  if (t.includes('rent') && t.includes('buy')) return 'beautiful modern house exterior'
  if (t.includes('mortgage')) return 'dream home house keys'
  if (t.includes('house') && t.includes('afford')) return 'beautiful suburban house'
  if (t.includes('invest') || t.includes('compound interest')) return 'growing savings investment chart'
  if (t.includes('retire') || t.includes('retirement')) return 'happy retired couple sunset beach'
  if (t.includes('budget') || t.includes('finance')) return 'personal finance money management'
  if (t.includes('inflation')) return 'rising prices grocery shopping'
  if (t.includes('college') || t.includes('university')) return 'beautiful university campus'
  if (t.includes('commute')) return 'city commuter highway traffic aerial'
  if (t.includes('freelance')) return 'freelancer laptop coffee shop workspace'
  if (t.includes('gym') || t.includes('workout')) return 'modern gym equipment fitness'
  if (t.includes('dog')) return 'happy dog golden retriever park'
  if (t.includes('cooking') || t.includes('eating')) return 'beautiful home cooking kitchen'
  if (t.includes('smoking')) return 'money jar savings health'
  if (t.includes('subscription')) return 'smartphone apps streaming services'
  if (t.includes('car') && (t.includes('spend') || t.includes('buy'))) return 'luxury car showroom'
  if (t.includes('airbnb') || t.includes('rental')) return 'beautiful vacation rental property'
  if (t.includes('london') || t.includes('lisbon')) return `${t.includes('london') ? 'London' : 'Lisbon'} city skyline beautiful`
  if (t.includes('dubai')) return 'Dubai skyline beautiful sunset'
  if (t.includes('robot vacuum')) return 'robot vacuum cleaner product photo top view'
  if (t.includes('ev') || t.includes('electric')) return 'electric car charging station modern'
  if (t.includes('ai') || t.includes('llm') || t.includes('chatgpt')) return 'artificial intelligence technology abstract'
  if (t.includes('vibe coding') || t.includes('programming')) return 'modern code editor developer workspace'
  if (t.includes('headphone')) return 'premium headphones lifestyle'
  if (t.includes('keyboard')) return 'mechanical keyboard desk setup'
  if (t.includes('laptop') || t.includes('macbook')) return 'premium laptop workspace'
  if (t.includes('guitar')) return 'electric guitar beautiful closeup'
  if (t.includes('camera')) return 'mirrorless camera photography equipment'
  if (t.includes('phone') || t.includes('iphone') || t.includes('galaxy')) return 'premium smartphone design'
  if (t.includes('skincare')) return 'skincare products flatlay clean'
  if (t.includes('backpack')) return 'premium travel backpack product photography'
  if (t.includes('travel') && !t.includes('backpack')) return 'beautiful travel destination landscape'
  if (t.includes('drum')) return 'electronic drum kit studio'
  if (t.includes('motorbike') || t.includes('motorcycle') || t.includes('superbike')) return 'sports motorcycle dynamic action shot'

  // Fall back to shortened title
  return shortenTitle(title)
}

export async function fetchThumbnailImage(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[],
  heroImageQuery?: string
): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  // Use AI-generated hero query if available, otherwise fall back to topic mapping
  const baseQuery = heroImageQuery || getHeroSubject(title, articleType)
  const isReplacing = excludeUrls && excludeUrls.length > 0

  // Different suffixes for variety on repeat searches
  const suffixes = [
    'beautiful high resolution photography',
    'editorial photograph professional',
    'stunning HD wallpaper',
    'aesthetic photography',
    'cinematic photo',
    'award winning photography',
    'magazine quality photo',
    'premium stock photography',
  ]

  const angleIndex = isReplacing ? (excludeUrls?.length ?? 0) % suffixes.length : 0
  // For the first search, try Unsplash specifically for highest quality
  const unsplashPrefix = angleIndex === 0 ? 'site:unsplash.com ' : ''
  const query = `${unsplashPrefix}${baseQuery} ${suffixes[angleIndex]}`.trim()
  console.log('[thumbnail] Search query:', query, `(angle ${angleIndex}, AI query: ${!!heroImageQuery})`)

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
      console.log(`[images] Searching for "${card.entity_name}": "${baseQuery}" (max: ${maxImages})`)
      const imageUrls = await fetchProductImages(baseQuery, maxImages, card.entity_name)
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
