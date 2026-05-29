import type { PlanEntity, ArticleContent, ArticleType, ImageDensity, ProductCard, ImageSection, ImageAttribution } from '@/types/article'
import { routeImageRequest, filterImageCandidates, type ImageCandidate, type ImageSource } from '@/lib/image-router'
import { searchPexels } from '@/lib/pexels'
import { searchUnsplash } from '@/lib/unsplash'
import { searchGoogleImages } from '@/lib/google-images'
import { selectBestImage } from '@/lib/image-selector'
import { rehostImage } from '@/lib/image-storage'

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
  const urls: string[] = []
  const seen = new Set<string>()
  const addUrl = (u: string) => {
    if (u && !seen.has(u)) { seen.add(u); urls.push(u) }
  }

  // Google Images first — best index for specific, named products.
  const googleCandidates = await searchGoogleImages(searchQuery, { count: maxImages + 6 })
  for (const c of filterImageCandidates(googleCandidates, 'product')) {
    addUrl(c.url)
    if (urls.length >= maxImages) break
  }

  // Supplement with Brave if Google didn't return enough.
  if (urls.length < maxImages) {
    const primaryResults = await searchBraveImages(searchQuery, 20)
    let secondaryResults: BraveImageResult[] = []
    if (maxImages > 2 && entityName) {
      const secondaryQuery = `${entityName} review photo high quality`
      secondaryResults = await searchBraveImages(secondaryQuery, 10)
    }
    // Allow multiple from same host for product galleries.
    const braveUrls = filterAndRankImageUrls([...primaryResults, ...secondaryResults], true)
    for (const u of braveUrls) {
      addUrl(u)
      if (urls.length >= maxImages) break
    }
  }

  return urls.slice(0, maxImages)
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
 * Generate a hero image search query using Claude Haiku.
 * Smart, context-aware — replaces the old hardcoded keyword matching.
 * Falls back to shortenTitle() if the API call fails.
 */
async function generateHeroQuery(
  title: string,
  summary: string,
  articleId?: string
): Promise<string> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return shortenTitle(title)

    const anthropic = new Anthropic({ apiKey, maxRetries: 2, timeout: 10_000 })
    const model = 'claude-haiku-4-5-20251001'

    const message = await anthropic.messages.create({
      model,
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `You are helping find a hero image for an editorial article. Given the article title and summary, return a single search query of 3-5 words that would find a strong, relevant, editorial-quality photograph.

Rules:
- Return ONLY the search query, nothing else
- If the title contains a specific named product, tool, person, or brand, the search query MUST lead with that name. "OpenClaw AI developer" not "developer coding terminal". Specific names first, generic descriptions only as a last resort.
- Focus on the most visually concrete aspect of the topic
- For products: use the actual product or brand name
- For people: use the person's name + context
- For concepts: find the most visual representation
- Never return generic terms like "technology" or "business" alone

Title: ${title}
Summary: ${summary.slice(0, 200)}

Search query:`,
      }],
    })

    // Log the API call
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase')
      const db = getSupabaseAdmin()
      await db.from('api_usage_log').insert({
        call_type: 'hero_query',
        model,
        input_tokens: message.usage?.input_tokens ?? 0,
        output_tokens: message.usage?.output_tokens ?? 0,
        article_id: articleId ?? null,
      })
    } catch {
      // Non-critical
    }

    const query = message.content.find(b => b.type === 'text')?.text?.trim() ?? ''
    if (query.length >= 3 && query.length <= 60) {
      console.log(`[hero-query] Haiku generated: "${query}" for "${title.slice(0, 40)}..."`)
      return query
    }

    console.warn(`[hero-query] Haiku returned invalid query: "${query}" — falling back to title`)
    return shortenTitle(title)
  } catch (err) {
    console.warn(`[hero-query] Haiku failed: ${(err as Error).message} — falling back to title`)
    return shortenTitle(title)
  }
}

/**
 * Fetch candidates from a specific image source.
 * Converts Brave results into ImageCandidate format for unified handling.
 */
async function fetchFromSource(
  source: ImageSource,
  query: string,
  count: number,
): Promise<ImageCandidate[]> {
  switch (source) {
    case 'google':
      return searchGoogleImages(query, { count })
    case 'pexels':
      return searchPexels(query, { perPage: count, orientation: 'landscape' })
    case 'unsplash':
      return searchUnsplash(query, { perPage: count, orientation: 'landscape' })
    case 'brave': {
      const results = await searchBraveImages(query, 20)
      const urls = filterAndRankImageUrls(results)
      return urls.slice(0, count).map(url => ({
        url,
        source: 'brave' as const,
        alt: query,
        width: 0, // Brave doesn't reliably return dimensions
        height: 0,
      }))
    }
    default:
      return []
  }
}

/**
 * Routed hero image search — tries sources in priority order based on article type.
 * Returns ImageCandidates with attribution for Pexels/Unsplash.
 */
async function resolveHeroCandidates(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[],
  heroImageQuery?: string,
  summary?: string,
  articleId?: string,
  style?: 'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract',
): Promise<ImageCandidate[]> {
  // Subject-led query from the planner (already name-led + de-metaphorized) —
  // the literal thing a human would type into Google Images.
  const baseQuery = heroImageQuery || await generateHeroQuery(title, summary ?? '', articleId)
  const isReplacing = excludeUrls && excludeUrls.length > 0

  // For replace requests, add a suffix for variety
  const suffixes = ['', 'photo', 'editorial', 'photography', 'image', 'press photo']
  const angleIndex = isReplacing ? (excludeUrls?.length ?? 0) % suffixes.length : 0
  const suffix = suffixes[angleIndex]
  const query = suffix ? `${baseQuery} ${suffix}` : baseQuery

  const excludeSet = new Set(excludeUrls ?? [])

  // Get source priority from the router (Google first)
  const sources = routeImageRequest({
    query,
    purpose: 'hero',
    articleType,
    style,
  })

  let candidates: ImageCandidate[] = []

  // Try sources in priority order until we have a healthy pool for selection.
  for (const source of sources) {
    if (candidates.length >= 8) break
    const needed = 8 - candidates.length
    const results = await fetchFromSource(source, query, needed + 2) // fetch extra to allow filtering
    const filtered = filterImageCandidates(results, 'hero')
      .filter(c => !excludeSet.has(c.url))
    candidates.push(...filtered)
    if (filtered.length > 0) {
      console.log(`[hero-images] ${source}: found ${filtered.length} candidates for "${query.slice(0, 40)}"`)
    }
  }

  return candidates
}

/**
 * Legacy-compatible resolveHeroImageUrls — returns just URLs.
 * Used by replace-thumbnail and other endpoints that don't need attribution.
 */
async function resolveHeroImageUrls(
  title: string,
  excludeUrls?: string[],
  heroImageQuery?: string,
  summary?: string,
  articleId?: string,
): Promise<string[]> {
  // Fall back to Brave-only for legacy callers (replace-thumbnail etc.)
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  const baseQuery = heroImageQuery || await generateHeroQuery(title, summary ?? '', articleId)
  const isReplacing = excludeUrls && excludeUrls.length > 0

  const suffixes = ['', 'photo', 'editorial', 'photography', 'image', 'press photo', 'high resolution', 'closeup']
  const angleIndex = isReplacing ? (excludeUrls?.length ?? 0) % suffixes.length : 0
  const suffix = suffixes[angleIndex]
  const query = suffix ? `${baseQuery} ${suffix}` : baseQuery

  const excludeSet = new Set(excludeUrls ?? [])

  try {
    const url = new URL('https://api.search.brave.com/res/v1/images/search')
    url.searchParams.set('q', query)
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
    return filterAndRankImageUrls(results).filter((u) => !excludeSet.has(u))
  } catch {
    return []
  }
}

export interface HeroImageResult {
  url: string | null
  attribution?: ImageAttribution | null
}

/**
 * Fetch a single hero image using the routed pipeline.
 * Returns the URL and attribution (if from Pexels/Unsplash).
 */
export async function fetchHeroImage(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[],
  heroImageQuery?: string,
  summary?: string,
  articleId?: string,
  style?: 'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract',
): Promise<HeroImageResult> {
  const candidates = await resolveHeroCandidates(
    title, articleType, excludeUrls, heroImageQuery, summary, articleId, style,
  )
  if (candidates.length === 0) return { url: null }

  // Vision model scans the candidates and picks the best one — the way a human
  // would scan a Google Images grid. Falls back to the top-ranked candidate.
  const subject = shortenTitle(title)
  const chosen = (await selectBestImage(candidates, subject, summary, articleId)) ?? candidates[0]

  // Rehost the chosen image to our own storage for a stable, hotlink-proof URL.
  let finalUrl = chosen.url
  if (articleId) {
    const rehosted = await rehostImage(chosen.url, articleId, 'hero')
    if (rehosted) finalUrl = rehosted
  }

  return {
    url: finalUrl,
    attribution: chosen.attribution ?? null,
  }
}

export async function fetchThumbnailImage(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[],
  heroImageQuery?: string,
  summary?: string,
  articleId?: string
): Promise<string | null> {
  // Use the routed pipeline
  const result = await fetchHeroImage(title, articleType, excludeUrls, heroImageQuery, summary, articleId)
  console.log('[thumbnail] Search result:', result.url ? `found (${result.attribution?.source_name ?? 'brave'})` : 'none')
  return result.url
}

/**
 * Fetch multiple thumbnail image candidates using the routed pipeline.
 * Returns up to `count` URLs after filtering and excluding seen URLs.
 */
export async function fetchMultipleThumbnailImages(
  title: string,
  articleType: ArticleType,
  excludeUrls?: string[],
  heroImageQuery?: string,
  count: number = 4,
  summary?: string,
  articleId?: string
): Promise<string[]> {
  const candidates = await resolveHeroCandidates(
    title, articleType, excludeUrls, heroImageQuery, summary, articleId,
  )
  console.log('[thumbnail-multi] Found', candidates.length, 'candidates, returning', Math.min(candidates.length, count))
  return candidates.slice(0, count).map(c => c.url)
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

/**
 * Resolve a single editorial-section image: search via the router (Google
 * first), optionally let the vision model pick the best candidate, then rehost
 * it to our storage. Returns a stable URL or null.
 */
async function resolveSectionImage(
  query: string,
  articleType: ArticleType,
  articleId?: string,
  useVision = true,
): Promise<string | null> {
  const sources = routeImageRequest({ query, purpose: 'editorial_section', articleType })
  let chosen: ImageCandidate | null = null
  for (const source of sources) {
    if (chosen) break
    const candidates = await fetchFromSource(source, query, useVision ? 6 : 3)
    const filtered = filterImageCandidates(candidates, 'editorial_section')
    if (filtered.length > 0) {
      chosen = useVision
        ? (await selectBestImage(filtered, query, undefined, articleId)) ?? filtered[0]
        : filtered[0]
    }
  }
  if (!chosen) return null
  if (articleId) {
    const rehosted = await rehostImage(chosen.url, articleId, 'section')
    if (rehosted) return rehosted
  }
  return chosen.url
}

export async function enrichArticleWithImages(
  article: ArticleContent,
  entities: PlanEntity[],
  imageDensity?: ImageDensity,
  articleId?: string,
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
      let imageUrls = await fetchProductImages(baseQuery, maxImages, card.entity_name)
      // Rehost the primary (most prominent) product image for a stable URL.
      // Gallery extras stay hotlinked to bound pipeline time.
      if (articleId && imageUrls.length > 0) {
        const rehosted = await rehostImage(imageUrls[0], articleId, 'product')
        if (rehosted) imageUrls = [rehosted, ...imageUrls.slice(1)]
      }
      return { entity_name: card.entity_name, imageUrls }
    })
  )

  // Build name -> urls map
  const imageMap = new Map(imageResults.map((r) => [r.entity_name, r.imageUrls]))

  // Find all image_section entries and fetch their images in parallel
  // These are editorial/lifestyle images — route through Pexels/Unsplash first
  const imageSections = article.sections
    .map((s, idx) => ({ section: s, idx }))
    .filter((x): x is { section: ImageSection; idx: number } => x.section.type === 'image_section')

  const imageSectionResults = await Promise.all(
    imageSections.map(async ({ section, idx }) => {
      const enrichedImages = await Promise.all(
        section.images.map(async (img) => {
          // Skip images that already have a URL (e.g. user-uploaded) or have no search query
          if (!img.search_query || img.image_url) return img
          // Google-first search → vision pick → rehost.
          const imageUrl = await resolveSectionImage(
            img.search_query,
            article.article_type as ArticleType,
            articleId,
          )
          return { ...img, image_url: imageUrl }
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

  // ── Fix 2: Enforce image minimums ──
  const isProductArticle = ['buyer_guide', 'comparison', 'decision_guide'].includes(article.article_type)
  const MIN_PRODUCT_IMAGES = 4

  if (isProductArticle && !skipProductImages) {
    // Retry for product cards with fewer than 4 images
    const retryPromises = enrichedSections
      .map((section, idx) => ({ section, idx }))
      .filter(({ section }) =>
        section.type === 'product_card' &&
        ((section as unknown as ProductCard).image_urls?.length ?? 0) < MIN_PRODUCT_IMAGES
      )
      .map(async ({ section, idx }) => {
        const card = section as unknown as ProductCard
        const currentUrls = card.image_urls ?? []
        const needed = MIN_PRODUCT_IMAGES - currentUrls.length
        if (needed <= 0) return

        // Retry with a different query variation
        const retryQuery = `${card.entity_name} review`
        console.log(`[images] Retry for "${card.entity_name}": need ${needed} more images, query: "${retryQuery}"`)
        const extraUrls = await fetchProductImages(retryQuery, needed + 2, card.entity_name)
        const newUrls = extraUrls.filter(u => !currentUrls.includes(u)).slice(0, needed)

        if (newUrls.length > 0) {
          const combined = [...currentUrls, ...newUrls]
          enrichedSections[idx] = {
            ...card,
            image_url: combined[0] ?? null,
            image_urls: combined,
          }
          console.log(`[images] Retry added ${newUrls.length} images for "${card.entity_name}" (now ${combined.length})`)
        }
      })

    await Promise.all(retryPromises)

    // Inject editorial images if none exist — route through Pexels/Unsplash first
    const hasEditorialImages = enrichedSections.some(s => s.type === 'image_section')
    if (!hasEditorialImages) {
      const titleTopic = article.title.split(/[:|—]/)[0].trim()
      const editorialQuery = `${titleTopic} editorial photography`
      console.log(`[images] No editorial images — searching via router: "${editorialQuery}"`)

      // Google-first search → vision pick → rehost.
      const editorialUrl = await resolveSectionImage(
        editorialQuery,
        article.article_type as ArticleType,
        articleId,
      )
      const editorialUrls = editorialUrl ? [editorialUrl] : []

      if (editorialUrls.length > 0) {
        const imageSection = {
          type: 'image_section' as const,
          heading: '',
          images: editorialUrls.map(url => ({ search_query: editorialQuery, caption: '', image_url: url })),
          layout: 'single' as const,
        }

        // Find insertion point: after 2nd content_section, or after 3rd product_card
        let insertIdx = -1
        let contentCount = 0
        let productCount = 0
        for (let i = 0; i < enrichedSections.length; i++) {
          if (enrichedSections[i].type === 'content_section') {
            contentCount++
            if (contentCount === 2) { insertIdx = i + 1; break }
          }
          if (enrichedSections[i].type === 'product_card') {
            productCount++
            if (productCount === 3 && insertIdx === -1) { insertIdx = i + 1 }
          }
        }

        if (insertIdx > 0) {
          enrichedSections.splice(insertIdx, 0, imageSection as unknown as typeof enrichedSections[0])
          console.log(`[images] Injected editorial image section at index ${insertIdx}`)
        }
      }
    }
  }

  // ── Fix 3: Enforce editorial image minimums for news/analysis articles ──
  const isNewsArticle = ['news_analysis', 'breaking_news', 'trend_analysis', 'deep_dive'].includes(article.article_type)
  if (isNewsArticle) {
    const existingEditorial = enrichedSections.filter(s => s.type === 'image_section').length
    const minEditorial = article.article_type === 'breaking_news' ? 2 : 3
    const needed = minEditorial - existingEditorial

    if (needed > 0) {
      // Build search queries from content_section headings — specific and photographable
      const contentSections = enrichedSections
        .map((s, idx) => ({ s, idx }))
        .filter(x => x.s.type === 'content_section' && (x.s as { heading?: string }).heading)

      // Pick sections evenly spread through the article
      const step = Math.max(1, Math.floor(contentSections.length / (needed + 1)))
      const targets = []
      for (let i = step; i < contentSections.length && targets.length < needed; i += step) {
        targets.push(contentSections[i])
      }

      const injected = await Promise.all(
        targets.map(async ({ s, idx }) => {
          const heading = (s as { heading?: string }).heading ?? ''
          const searchQuery = `${heading} editorial photography`
          const imageUrl = await resolveSectionImage(
            searchQuery,
            article.article_type as ArticleType,
            articleId,
          )
          if (!imageUrl) return null
          return {
            insertAfter: idx,
            section: {
              type: 'image_section' as const,
              heading: '',
              images: [{ search_query: searchQuery, caption: '', image_url: imageUrl }],
              layout: 'single' as const,
            },
          }
        })
      )

      // Insert in reverse order so indices don't shift
      const valid = injected.filter(Boolean) as { insertAfter: number; section: typeof enrichedSections[0] }[]
      valid.sort((a, b) => b.insertAfter - a.insertAfter)
      for (const { insertAfter, section } of valid) {
        enrichedSections.splice(insertAfter + 1, 0, section as unknown as typeof enrichedSections[0])
        console.log(`[images] Injected news editorial image after section ${insertAfter}`)
      }
    }
  }

  // Logging
  const productCardsWithImages = enrichedSections
    .filter(s => s.type === 'product_card')
    .filter(s => ((s as unknown as ProductCard).image_urls?.length ?? 0) >= MIN_PRODUCT_IMAGES)
  const editorialCount = enrichedSections.filter(s => s.type === 'image_section').length
  const totalProducts = enrichedSections.filter(s => s.type === 'product_card').length
  console.log(`[images] Article "${article.title?.slice(0, 40)}": ${productCardsWithImages.length}/${totalProducts} cards with ${MIN_PRODUCT_IMAGES}+ images, ${editorialCount} editorial sections`)

  return { ...article, sections: enrichedSections }
}
