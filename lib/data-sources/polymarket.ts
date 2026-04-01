/**
 * Polymarket Integration (Session 1.7E, updated 1.8C)
 *
 * Fetches prediction market odds from Polymarket's public API.
 * No API key required.
 *
 * Returns structured results with question, outcome probabilities, and volume.
 * Filters out low-volume markets (<$10k) and irrelevant results.
 */

export interface PolymarketResult {
  question: string
  outcomes: string[]
  probabilities: number[]
  volume: number
  url: string
  source: 'polymarket'
}

const POLYMARKET_API = 'https://gamma-api.polymarket.com/markets'
const MIN_VOLUME = 10_000 // Filter out markets with <$10k volume

// Common words that don't indicate topic relevance
const STOP_WORDS = new Set([
  'will', 'the', 'a', 'an', 'be', 'is', 'are', 'was', 'were', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'shall', 'should',
  'may', 'might', 'must', 'can', 'could', 'would', 'of', 'in', 'to',
  'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'it', 'its', 'he', 'she', 'they', 'them', 'we', 'us', 'i', 'me',
  'my', 'your', 'his', 'her', 'our', 'their', 'up', 'out', 'off',
  'over', 'get', 'go', 'going', 'make', 'take', 'come', 'know',
  'think', 'see', 'look', 'want', 'give', 'use', 'find', 'tell',
  'say', 'said', 'new', 'first', 'last', 'long', 'great', 'little',
  'own', 'old', 'right', 'big', 'high', 'different', 'small', 'large',
  'next', 'early', 'young', 'important', 'public', 'bad', 'good',
  'happen', 'hit', 'before', 'win', 'return',
])

/**
 * Extract meaningful keywords from a query string.
 * Removes stop words, short words, and numbers.
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
}

/**
 * Calculate relevance score: how many query keywords appear in the market question.
 * Returns a value between 0 and 1 (fraction of keywords matched).
 */
function relevanceScore(questionLower: string, keywords: string[]): number {
  if (keywords.length === 0) return 0
  let matched = 0
  for (const kw of keywords) {
    if (questionLower.includes(kw)) matched++
  }
  return matched / keywords.length
}

/**
 * Search Polymarket for prediction markets relevant to the query.
 * Returns top 3 most relevant active markets with >$10k volume.
 *
 * @param query - The search query (e.g., "China invades Taiwan by 2027")
 * @param entityKeywords - Optional additional keywords from article entities/title for relevance matching
 */
export async function searchPolymarket(
  query: string,
  entityKeywords?: string[],
): Promise<PolymarketResult[]> {
  if (!query || query.length < 3) return []

  try {
    const params = new URLSearchParams({
      tag: 'all',
      status: 'active',
      active: 'true',
      closed: 'false',
      _limit: '10',
      query,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`${POLYMARKET_API}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[polymarket] API error ${res.status}`)
      return []
    }

    const markets = (await res.json()) as Record<string, unknown>[]
    if (!Array.isArray(markets)) return []

    // Build keyword list from query + optional entity keywords
    const queryKeywords = extractKeywords(query)
    const allKeywords = entityKeywords
      ? [...new Set([...queryKeywords, ...entityKeywords.flatMap(e => extractKeywords(e))])]
      : queryKeywords

    const results: Array<PolymarketResult & { _relevance: number }> = []

    for (const market of markets) {
      try {
        const question = String(market.question ?? '')
        if (!question) continue

        // Parse outcomes and probabilities from JSON strings
        let outcomes: string[] = []
        let probabilities: number[] = []

        try {
          outcomes = JSON.parse(String(market.outcomes ?? '[]'))
        } catch { outcomes = [] }

        try {
          const prices = JSON.parse(String(market.outcomePrices ?? '[]'))
          probabilities = prices.map((p: string | number) => parseFloat(String(p)))
        } catch { probabilities = [] }

        if (outcomes.length === 0 || probabilities.length === 0) continue
        if (outcomes.length !== probabilities.length) continue

        // Filter out resolved/settled markets — all probs at 0% or 100% means it's done
        const allResolved = probabilities.every(p => p <= 0.01 || p >= 0.99)
        if (allResolved) continue

        // Require at least one outcome with meaningful probability spread (5%–95%)
        const hasMeaningfulSpread = probabilities.some(p => p >= 0.05 && p <= 0.95)
        if (!hasMeaningfulSpread) continue

        const volume = parseFloat(String(market.volume ?? '0'))
        if (volume < MIN_VOLUME) continue

        // ── Relevance check ──
        // Market question must contain at least one keyword from the query/entities
        const questionLower = question.toLowerCase()
        const score = relevanceScore(questionLower, allKeywords)

        // Require at least 1 keyword match (score > 0)
        if (score === 0) {
          continue
        }

        const slug = String(market.slug ?? '')
        const url = slug
          ? `https://polymarket.com/event/${slug}`
          : 'https://polymarket.com'

        results.push({
          question,
          outcomes,
          probabilities,
          volume,
          url,
          source: 'polymarket',
          _relevance: score,
        })
      } catch {
        // Skip malformed market entries
        continue
      }
    }

    if (results.length === 0) {
      console.log(`[polymarket] No relevant markets found for "${query}" (${allKeywords.join(', ')})`)
      return []
    }

    // Sort by relevance first, then by volume within same relevance tier
    const sorted = results.sort((a, b) => {
      // Group into relevance tiers: high (>= 0.4), medium (>= 0.2), low (> 0)
      const tierA = a._relevance >= 0.4 ? 2 : a._relevance >= 0.2 ? 1 : 0
      const tierB = b._relevance >= 0.4 ? 2 : b._relevance >= 0.2 ? 1 : 0
      if (tierA !== tierB) return tierB - tierA
      return b.volume - a.volume
    })

    console.log(`[polymarket] Found ${sorted.length} relevant market(s) for "${query}" — top: "${sorted[0].question}" (relevance: ${sorted[0]._relevance.toFixed(2)})`)

    // Strip internal _relevance field before returning
    return sorted.slice(0, 3).map(({ _relevance, ...rest }) => rest)
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[polymarket] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
