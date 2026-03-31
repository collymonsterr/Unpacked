/**
 * Polymarket Integration (Session 1.7E)
 *
 * Fetches prediction market odds from Polymarket's public API.
 * No API key required.
 *
 * Returns structured results with question, outcome probabilities, and volume.
 * Filters out low-volume markets (<$10k) to avoid noise.
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

/**
 * Search Polymarket for prediction markets relevant to the query.
 * Returns top 3 most relevant active markets with >$10k volume.
 */
export async function searchPolymarket(query: string): Promise<PolymarketResult[]> {
  if (!query || query.length < 3) return []

  try {
    const params = new URLSearchParams({
      tag: 'all',
      status: 'active',
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

    const results: PolymarketResult[] = []

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

        const volume = parseFloat(String(market.volume ?? '0'))
        if (volume < MIN_VOLUME) continue

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
        })
      } catch {
        // Skip malformed market entries
        continue
      }
    }

    // Sort by volume descending, return top 3
    return results
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[polymarket] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
