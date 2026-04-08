/**
 * Brave Search pre-research step.
 * Runs structured searches and compiles a condensed research summary
 * for the writing model (Gemini or Sonnet).
 */

import type { ArticleType } from '@/lib/article-types'

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search'
const BRAVE_IMAGE_API = 'https://api.search.brave.com/res/v1/images/search'

interface SearchResult {
  title: string
  url: string
  snippet: string
}

interface RedditThread {
  title: string
  url: string
  subreddit: string
  num_comments?: number
  score?: number
}

interface ResearchFinding {
  id: string
  source: string
  source_type: 'web' | 'reddit' | 'twitter'
  url: string
  content: string
  used_in_article: boolean
}

interface ResearchOutput {
  summary: string
  tokenEstimate: number
  searchCount: number
  sources: { title: string; url: string }[]
  redditThreads: RedditThread[]
  findings: ResearchFinding[]
}

/** Brave Search freshness param. pd = past day, pw = past week, pm = past month. */
export type BraveFreshness = 'pd' | 'pw' | 'pm'

export async function braveSearch(
  query: string,
  count = 8,
  freshness?: BraveFreshness,
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL(BRAVE_API)
    url.searchParams.set('q', query)
    url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', 'strict')
    url.searchParams.set('text_decorations', 'false')
    if (freshness) {
      url.searchParams.set('freshness', freshness)
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.web?.results ?? []).map((r: Record<string, string>) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }))
  } catch {
    return []
  }
}

function extractPrices(text: string): string[] {
  const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g) ?? []
  return [...new Set(matches)]
}

// Remove characters that would break JSON string parsing if Gemini copies
// research text verbatim into a JSON field without escaping.
// Double quotes are the primary cause — they terminate string literals early.
// Backslashes are secondary — a lone \ before a non-escape char is also invalid JSON.
function sanitizeSnippet(text: string): string {
  return text.replace(/"/g, "'").replace(/\\/g, '/')
}

const MIN_REDDIT_COMMENTS = 10

/**
 * Fetch metadata for a Reddit thread via public JSON API.
 * Returns num_comments and score, or null on failure.
 */
async function fetchRedditMetadata(url: string): Promise<{ num_comments: number; score: number } | null> {
  try {
    // Normalize URL: strip trailing slash, query params, append .json
    let cleanUrl = url.split('?')[0].replace(/\/+$/, '')
    // Remove existing .json if present
    cleanUrl = cleanUrl.replace(/\.json$/, '')
    const jsonUrl = `${cleanUrl}.json`

    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'Unpacked/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const data = await res.json()
    // Reddit returns an array — first element is the post listing
    const postData = data?.[0]?.data?.children?.[0]?.data
    if (!postData) return null

    return {
      num_comments: postData.num_comments ?? 0,
      score: postData.score ?? 0,
    }
  } catch {
    // Don't block pipeline on metadata failure
    return null
  }
}

/**
 * Enrich Reddit threads with metadata and filter by comment count.
 * Fetches .json for each thread sequentially with 200ms delay.
 * If all threads fail the filter, keeps the one with the highest comment count.
 */
async function enrichAndFilterRedditThreads(threads: RedditThread[]): Promise<RedditThread[]> {
  if (threads.length === 0) return []

  const enriched: RedditThread[] = []

  for (let i = 0; i < threads.length; i++) {
    if (i > 0) {
      // 200ms delay between requests to avoid Reddit rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    const meta = await fetchRedditMetadata(threads[i].url)
    if (meta) {
      enriched.push({ ...threads[i], num_comments: meta.num_comments, score: meta.score })
    } else {
      // Metadata fetch failed — include thread without filtering (benefit of the doubt)
      enriched.push(threads[i])
    }
  }

  // Apply 10-comment minimum filter
  const passing = enriched.filter(t => {
    if (t.num_comments === undefined) return true // no metadata — include anyway
    if (t.num_comments >= MIN_REDDIT_COMMENTS) return true
    console.log(`[brave-research] Discarded ${t.subreddit} thread (${t.num_comments} comments) — below ${MIN_REDDIT_COMMENTS}-comment minimum`)
    return false
  })

  // If ALL threads were filtered out, keep the best one
  if (passing.length === 0 && enriched.length > 0) {
    const best = enriched.reduce((a, b) => ((a.num_comments ?? 0) >= (b.num_comments ?? 0) ? a : b))
    console.warn(`[brave-research] All Reddit threads below ${MIN_REDDIT_COMMENTS} comments — keeping best (${best.num_comments ?? '?'} comments in ${best.subreddit})`)
    return [best]
  }

  return passing
}

function generateSearchQueries(
  query: string,
  entities: { name: string }[],
  articleType: ArticleType,
  searchCount: number
): string[] {
  const year = new Date().getFullYear()
  const queries: string[] = []

  // ~40% topic queries
  queries.push(`${query} ${year} reviews recommendations`)
  queries.push(`best ${query} ${year}`)

  // ~40% entity-specific
  for (const entity of entities.slice(0, Math.ceil(searchCount * 0.4))) {
    queries.push(`${entity.name} review ${year} price specs`)
  }

  // ~10-20% Reddit/forum
  queries.push(`${query} reddit ${year}`)

  // ~10-20% pricing (product-focused types)
  if ((['buyer_guide', 'comparison', 'decision_guide', 'roundup'] as ArticleType[]).includes(articleType)) {
    queries.push(`${query} price comparison ${year}`)
  }

  // Fill to target count
  if (queries.length < searchCount) {
    queries.push(`${query} expert review ${year}`)
  }
  if (queries.length < searchCount) {
    queries.push(`${query} twitter X opinions ${year}`)
  }

  return queries.slice(0, searchCount)
}

export { type SearchResult, type ResearchOutput, type ResearchFinding }

export async function compileResearch(
  allResults: Map<string, SearchResult[]>,
  entities: { name: string }[],
): Promise<ResearchOutput> {
  const sources: { title: string; url: string }[] = []
  const seenUrls = new Set<string>()
  const allFindings: ResearchFinding[] = []
  let findingCounter = 0

  // Extract prices per entity
  const priceMap = new Map<string, string[]>()
  const specMap = new Map<string, string[]>()
  const communityInsights: string[] = []
  const topicFacts: string[] = []
  // Track which URLs end up in the summary (used_in_article)
  const usedUrls = new Set<string>()

  for (const [searchQuery, results] of allResults) {
    const isReddit = searchQuery.includes('reddit')
    const isTwitter = searchQuery.includes('twitter') || searchQuery.includes('X ')

    for (const r of results) {
      // Track sources (deduplicated)
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url)
        sources.push({ title: r.title, url: r.url })
      }

      // Determine source info for findings
      let sourceType: 'web' | 'reddit' | 'twitter' = 'web'
      let sourceName = r.title
      if (isReddit || r.url.includes('reddit.com')) {
        sourceType = 'reddit'
        const subMatch = r.url.match(/\/r\/([^/]+)/)
        sourceName = subMatch ? `r/${subMatch[1]}` : 'Reddit'
      } else if (isTwitter) {
        sourceType = 'twitter'
        sourceName = 'Twitter/X'
      }

      // Track whether this result contributes to the summary
      let usedInSummary = false

      // Extract prices
      const prices = extractPrices(r.snippet)
      for (const entity of entities) {
        const name = entity.name.toLowerCase()
        if (r.title.toLowerCase().includes(name) || r.snippet.toLowerCase().includes(name)) {
          if (prices.length > 0) {
            const existing = priceMap.get(entity.name) ?? []
            existing.push(...prices)
            priceMap.set(entity.name, existing)
            usedInSummary = true
          }
          // Extract specs/features from snippet
          if (r.snippet.length > 50) {
            const specs = specMap.get(entity.name) ?? []
            specs.push(sanitizeSnippet(r.snippet.slice(0, 200)))
            specMap.set(entity.name, specs)
            usedInSummary = true
          }
        }
      }

      // Community insights
      if (isReddit || isTwitter) {
        if (r.snippet.length > 30) {
          const source = isReddit ? 'Reddit' : 'Twitter/X'
          communityInsights.push(`${source}: ${sanitizeSnippet(r.snippet.slice(0, 200))}`)
          usedInSummary = true
        }
      } else {
        // General topic facts
        if (r.snippet.length > 40) {
          topicFacts.push(sanitizeSnippet(r.snippet.slice(0, 200)))
          usedInSummary = true
        }
      }

      if (usedInSummary) usedUrls.add(r.url)

      // Capture every result as a finding
      if (r.snippet.length > 10) {
        findingCounter++
        allFindings.push({
          id: `finding_${String(findingCounter).padStart(3, '0')}`,
          source: sourceName,
          source_type: sourceType,
          url: r.url,
          content: r.snippet,
          used_in_article: false, // set correctly after summary is built
        })
      }
    }
  }

  // Build structured summary
  const parts: string[] = []

  parts.push('RESEARCH SUMMARY')
  parts.push('')

  // Verified prices
  if (priceMap.size > 0) {
    parts.push('VERIFIED PRICES:')
    for (const [name, prices] of priceMap) {
      const unique = [...new Set(prices)].slice(0, 3)
      if (unique.length === 1) {
        parts.push(`- ${name}: ${unique[0]} (from search results)`)
      } else if (unique.length > 1) {
        parts.push(`- ${name}: ${unique.join(' – ')} (range from multiple sources)`)
      }
    }
    // Entities without prices
    for (const entity of entities) {
      if (!priceMap.has(entity.name)) {
        parts.push(`- ${entity.name}: price varies — check retailer`)
      }
    }
    parts.push('')
  }

  // Products & specs
  if (specMap.size > 0) {
    parts.push('PRODUCTS & SPECS:')
    for (const [name, specs] of specMap) {
      parts.push(`- ${name}: ${specs.slice(0, 2).join(' | ')}`)
    }
    parts.push('')
  }

  // Key findings
  if (topicFacts.length > 0) {
    parts.push('KEY FINDINGS:')
    // Deduplicate and limit
    const unique = [...new Set(topicFacts)].slice(0, 8)
    for (const fact of unique) {
      parts.push(`- ${fact}`)
    }
    parts.push('')
  }

  // Community sentiment
  if (communityInsights.length > 0) {
    parts.push('COMMUNITY SENTIMENT:')
    const unique = [...new Set(communityInsights)].slice(0, 5)
    for (const insight of unique) {
      parts.push(`- ${insight}`)
    }
    parts.push('')
  }

  // Extract Reddit threads from sources + enrich with metadata + filter
  let redditThreads: RedditThread[] = []
  try {
    const rawThreads: RedditThread[] = []
    for (const s of sources) {
      if (!s.url.includes('reddit.com')) continue
      if (rawThreads.length >= 5) break

      // Extract subreddit from URL: /r/subreddit/
      const subMatch = s.url.match(/\/r\/([^/]+)/)
      const subreddit = subMatch ? `r/${subMatch[1]}` : 'Reddit'

      rawThreads.push({
        title: s.title,
        url: s.url,
        subreddit,
      })
    }

    // Fetch metadata and filter by comment count
    redditThreads = await enrichAndFilterRedditThreads(rawThreads)
  } catch {
    // Never fail research because of Reddit extraction
  }

  // Reddit threads section (include comment count for writer credibility)
  if (redditThreads.length > 0) {
    parts.push('REDDIT THREADS:')
    for (const t of redditThreads) {
      const commentInfo = t.num_comments ? ` (${t.num_comments} comments)` : ''
      parts.push(`- [${t.subreddit}]${commentInfo} ${sanitizeSnippet(t.title)} — ${t.url}`)
    }
    parts.push('')
  }

  // Sources
  parts.push('SOURCES:')
  for (const s of sources.slice(0, 15)) {
    parts.push(`- ${sanitizeSnippet(s.title)} — ${s.url}`)
  }

  const summary = parts.join('\n')
  const tokenEstimate = Math.round(summary.length / 3.8)

  // Mark findings that contributed to the summary
  for (const f of allFindings) {
    if (usedUrls.has(f.url)) {
      f.used_in_article = true
    }
  }

  // Trim if over 4000 tokens
  if (tokenEstimate > 4000) {
    const trimmed = summary.slice(0, 15000) // ~3900 tokens
    return {
      summary: trimmed,
      tokenEstimate: Math.round(trimmed.length / 3.8),
      searchCount: allResults.size,
      sources: sources.slice(0, 15),
      redditThreads,
      findings: allFindings,
    }
  }

  return {
    summary,
    tokenEstimate,
    searchCount: allResults.size,
    sources: sources.slice(0, 15),
    redditThreads,
    findings: allFindings,
  }
}

/**
 * Execute an array of Brave search queries in parallel.
 * Cap at 6 simultaneous to avoid rate limits — if more than 6, split into two batches.
 * Each query may carry an optional `freshness` value (pd/pw/pm) — when set, it's passed
 * to the Brave Search API as a per-query time filter. Omit for no filter.
 */
export async function executeBraveQueries(
  queries: Array<{ query: string; purpose?: string; freshness?: BraveFreshness }>,
  resultsPerQuery = 6,
): Promise<Map<string, SearchResult[]>> {
  const allResults = new Map<string, SearchResult[]>()
  const MAX_PARALLEL = 6

  if (queries.length <= MAX_PARALLEL) {
    // All at once
    const results = await Promise.all(
      queries.map(async (q) => {
        const r = await braveSearch(q.query, resultsPerQuery, q.freshness)
        return [q.query, r] as const
      })
    )
    for (const [q, r] of results) {
      allResults.set(q, r)
    }
  } else {
    // Split into batches of MAX_PARALLEL
    const batches: Array<{ query: string; purpose?: string; freshness?: BraveFreshness }>[] = []
    for (let i = 0; i < queries.length; i += MAX_PARALLEL) {
      batches.push(queries.slice(i, i + MAX_PARALLEL))
    }
    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(async (q) => {
          const r = await braveSearch(q.query, resultsPerQuery, q.freshness)
          return [q.query, r] as const
        })
      )
      for (const [q, r] of results) {
        allResults.set(q, r)
      }
    }
  }

  return allResults
}

/** @deprecated Use executeResearch() from research-orchestrator.ts instead */
export async function runBraveResearch(
  query: string,
  entities: { name: string }[],
  articleType: ArticleType,
  length: 'quick' | 'standard' | 'deep' = 'standard',
): Promise<ResearchOutput> {
  const searchCounts = { quick: 5, standard: 7, deep: 9 }
  const targetSearches = searchCounts[length] ?? 7

  const searchQueries = generateSearchQueries(query, entities, articleType, targetSearches)

  console.log(`[brave-research] Running ${searchQueries.length} searches for "${query.slice(0, 40)}..."`)

  const allResults = new Map<string, SearchResult[]>()

  // Run searches concurrently (max 3 at a time)
  const chunks: string[][] = []
  for (let i = 0; i < searchQueries.length; i += 3) {
    chunks.push(searchQueries.slice(i, i + 3))
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (q) => {
        const r = await braveSearch(q, 6)
        return [q, r] as const
      })
    )
    for (const [q, r] of results) {
      allResults.set(q, r)
    }
  }

  const research = await compileResearch(allResults, entities)
  console.log(`[brave-research] Complete: ${research.searchCount} searches, ~${research.tokenEstimate} tokens, ${research.sources.length} sources`)

  return research
}
