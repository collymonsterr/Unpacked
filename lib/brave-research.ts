/**
 * Brave Search pre-research step.
 * Runs structured searches and compiles a condensed research summary
 * for the writing model (Gemini or Sonnet).
 */

import type { ArticleType } from '@/types/article'

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
}

interface ResearchOutput {
  summary: string
  tokenEstimate: number
  searchCount: number
  sources: { title: string; url: string }[]
  redditThreads: RedditThread[]
}

async function braveSearch(query: string, count = 8): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL(BRAVE_API)
    url.searchParams.set('q', query)
    url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', 'strict')
    url.searchParams.set('text_decorations', 'false')

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
  if ((['buyer_guide', 'comparison', 'decision_guide'] as ArticleType[]).includes(articleType)) {
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

function compileResearch(
  allResults: Map<string, SearchResult[]>,
  entities: { name: string }[],
): ResearchOutput {
  const sources: { title: string; url: string }[] = []
  const seenUrls = new Set<string>()

  // Extract prices per entity
  const priceMap = new Map<string, string[]>()
  const specMap = new Map<string, string[]>()
  const communityInsights: string[] = []
  const topicFacts: string[] = []

  for (const [searchQuery, results] of allResults) {
    const isReddit = searchQuery.includes('reddit')
    const isTwitter = searchQuery.includes('twitter') || searchQuery.includes('X ')

    for (const r of results) {
      // Track sources (deduplicated)
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url)
        sources.push({ title: r.title, url: r.url })
      }

      // Extract prices
      const prices = extractPrices(r.snippet)
      for (const entity of entities) {
        const name = entity.name.toLowerCase()
        if (r.title.toLowerCase().includes(name) || r.snippet.toLowerCase().includes(name)) {
          if (prices.length > 0) {
            const existing = priceMap.get(entity.name) ?? []
            existing.push(...prices)
            priceMap.set(entity.name, existing)
          }
          // Extract specs/features from snippet
          if (r.snippet.length > 50) {
            const specs = specMap.get(entity.name) ?? []
            specs.push(sanitizeSnippet(r.snippet.slice(0, 200)))
            specMap.set(entity.name, specs)
          }
        }
      }

      // Community insights
      if (isReddit || isTwitter) {
        if (r.snippet.length > 30) {
          const source = isReddit ? 'Reddit' : 'Twitter/X'
          communityInsights.push(`${source}: ${sanitizeSnippet(r.snippet.slice(0, 200))}`)
        }
      } else {
        // General topic facts
        if (r.snippet.length > 40) {
          topicFacts.push(sanitizeSnippet(r.snippet.slice(0, 200)))
        }
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

  // Extract Reddit threads from sources
  const redditThreads: RedditThread[] = []
  try {
    for (const s of sources) {
      if (!s.url.includes('reddit.com')) continue
      if (redditThreads.length >= 5) break

      // Extract subreddit from URL: /r/subreddit/
      const subMatch = s.url.match(/\/r\/([^/]+)/)
      const subreddit = subMatch ? `r/${subMatch[1]}` : 'Reddit'

      redditThreads.push({
        title: s.title,
        url: s.url,
        subreddit,
      })
    }
  } catch {
    // Never fail research because of Reddit extraction
  }

  // Reddit threads section
  if (redditThreads.length > 0) {
    parts.push('REDDIT THREADS:')
    for (const t of redditThreads) {
      parts.push(`- [${t.subreddit}] ${sanitizeSnippet(t.title)} — ${t.url}`)
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

  // Trim if over 4000 tokens
  if (tokenEstimate > 4000) {
    const trimmed = summary.slice(0, 15000) // ~3900 tokens
    return {
      summary: trimmed,
      tokenEstimate: Math.round(trimmed.length / 3.8),
      searchCount: allResults.size,
      sources: sources.slice(0, 15),
      redditThreads,
    }
  }

  return {
    summary,
    tokenEstimate,
    searchCount: allResults.size,
    sources: sources.slice(0, 15),
    redditThreads,
  }
}

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

  const research = compileResearch(allResults, entities)
  console.log(`[brave-research] Complete: ${research.searchCount} searches, ~${research.tokenEstimate} tokens, ${research.sources.length} sources`)

  return research
}
