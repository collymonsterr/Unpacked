/**
 * Polymarket Integration (Session 1.7E, updated Session A)
 *
 * Fetches prediction market odds from Polymarket's public API.
 * No API key required.
 *
 * Stage A: Fetch broadly from Polymarket API
 * Stage B: Hard reject obviously non-serious markets
 * Stage C: Haiku LLM relevance selection (replaces keyword matching)
 */

import { logApiCall } from '@/lib/api-usage'

export interface PolymarketResult {
  question: string
  outcomes: string[]
  probabilities: number[]
  volume: number
  url: string
  source: 'polymarket'
}

const POLYMARKET_API = 'https://gamma-api.polymarket.com/markets'
const MIN_VOLUME = 10_000

// Stage B: Hard reject obviously non-serious markets
const BLOCKED_TERMS = [
  'gta', 'jesus christ', 'meme coin', 'kanye', 'kardashian',
  'flat earth', 'ufo', 'alien invasion', 'zombie', 'vampire',
  'will god', 'second coming', 'rapture', 'hot dog', 'eating contest',
  'bigfoot', 'loch ness', 'santa claus', 'tooth fairy',
]

interface PolymarketCandidate {
  id: string
  question: string
  outcomes: string[]
  probabilities: number[]
  volume: number
  url: string
}

/**
 * Stage A: Fetch candidate markets from Polymarket API.
 * Returns up to 15 candidates with basic mechanical filters.
 */
async function fetchCandidates(query: string): Promise<PolymarketCandidate[]> {
  const params = new URLSearchParams({
    tag: 'all',
    status: 'active',
    active: 'true',
    closed: 'false',
    _limit: '15',
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

  const candidates: PolymarketCandidate[] = []

  for (const market of markets) {
    try {
      const question = String(market.question ?? '')
      if (!question) continue

      let outcomes: string[] = []
      let probabilities: number[] = []

      try { outcomes = JSON.parse(String(market.outcomes ?? '[]')) } catch { outcomes = [] }
      try {
        const prices = JSON.parse(String(market.outcomePrices ?? '[]'))
        probabilities = prices.map((p: string | number) => parseFloat(String(p)))
      } catch { probabilities = [] }

      if (outcomes.length === 0 || probabilities.length === 0) continue
      if (outcomes.length !== probabilities.length) continue

      // Filter resolved markets
      const allResolved = probabilities.every(p => p <= 0.01 || p >= 0.99)
      if (allResolved) continue

      // Require meaningful probability spread (5%-95%)
      const hasMeaningfulSpread = probabilities.some(p => p >= 0.05 && p <= 0.95)
      if (!hasMeaningfulSpread) continue

      const volume = parseFloat(String(market.volume ?? '0'))
      if (volume < MIN_VOLUME) continue

      const slug = String(market.slug ?? '')
      const id = String(market.id ?? slug ?? candidates.length)

      candidates.push({
        id,
        question,
        outcomes,
        probabilities,
        volume,
        url: slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com',
      })
    } catch {
      continue
    }
  }

  return candidates
}

/**
 * Stage B: Remove obviously non-serious markets.
 */
function filterBlocked(candidates: PolymarketCandidate[]): PolymarketCandidate[] {
  return candidates.filter(c => {
    const lower = c.question.toLowerCase()
    return !BLOCKED_TERMS.some(term => lower.includes(term))
  })
}

/**
 * Stage C: Use Haiku to select genuinely relevant markets.
 * Returns 0-2 markets that are directly relevant to the article topic.
 */
async function selectMarketsWithHaiku(
  articleTitle: string,
  articleThesis: string,
  articleType: string,
  candidates: PolymarketCandidate[],
  articleId?: string,
): Promise<PolymarketCandidate[]> {
  if (candidates.length === 0) return []

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[polymarket] No ANTHROPIC_API_KEY — skipping Haiku filter')
    return candidates.slice(0, 2)
  }

  const formatVolume = (v: number) => v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : `${Math.round(v / 1000)}k`

  const candidateList = candidates
    .map((c, i) => `${i + 1}. [${c.id}] "${c.question}" (Volume: $${formatVolume(c.volume)})`)
    .join('\n')

  const prompt = `You are selecting prediction markets for an article published on Unpacked.

ARTICLE TITLE: ${articleTitle}
ARTICLE THESIS: ${articleThesis}
ARTICLE TYPE: ${articleType}

Below are candidate prediction markets from Polymarket. Select ONLY markets that are DIRECTLY relevant to this article's core topic.

CANDIDATES:
${candidateList}

RULES:
- Select 0 to 2 markets maximum
- A market is relevant ONLY if it directly relates to the article's main thesis or core question
- Sharing a keyword is NOT enough — the market must be about the SAME topic
- If the article is about gold investing, a market about Bitcoin is NOT relevant
- If the article is about Taiwan, a market about the NHL is NOT relevant
- If the article is about robotics, a market about sports is NOT relevant
- Prefer markets with higher volume (more credible)
- If NO markets are genuinely relevant, return an empty array — this is correct in many cases
- Be strict. Showing zero markets is always better than showing irrelevant ones.

Return ONLY a JSON array of selected market IDs. Examples:
["id1", "id2"] or [] if none relevant.`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[polymarket] Haiku API error ${res.status}`)
      return []
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    // Log usage
    logApiCall({
      callType: 'polymarket_filter',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      articleId,
    })

    // Parse the JSON array of IDs
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log('[polymarket] Haiku returned no JSON array — treating as no relevant markets')
      return []
    }

    const selectedIds: string[] = JSON.parse(jsonMatch[0])
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      console.log('[polymarket] Haiku selected 0 markets — none relevant')
      return []
    }

    // Match IDs back to candidates
    const selected = selectedIds
      .map(id => candidates.find(c => c.id === id))
      .filter((c): c is PolymarketCandidate => c != null)
      .slice(0, 2)

    console.log(`[polymarket] Haiku selected ${selected.length} of ${candidates.length} markets: ${selected.map(s => `"${s.question.slice(0, 50)}"`).join(', ')}`)
    return selected
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[polymarket] Haiku filter failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return [] // Fail safe — show nothing rather than irrelevant markets
  }
}

/**
 * Search Polymarket for prediction markets relevant to the article.
 *
 * Pipeline:
 *   A. Fetch up to 15 candidates from API
 *   B. Hard reject non-serious markets (blocklist)
 *   C. Haiku LLM selects 0-2 genuinely relevant markets
 *
 * @param query - Search query (e.g., "China invades Taiwan by 2027")
 * @param articleContext - Article context for LLM relevance filtering
 */
export async function searchPolymarket(
  query: string,
  articleContext?: {
    title: string
    thesis: string
    articleType: string
    articleId?: string
  },
): Promise<PolymarketResult[]> {
  if (!query || query.length < 3) return []

  try {
    // Stage A: Fetch broadly
    const candidates = await fetchCandidates(query)
    if (candidates.length === 0) {
      console.log(`[polymarket] No candidates found for "${query}"`)
      return []
    }

    console.log(`[polymarket] Stage A: ${candidates.length} candidates for "${query}"`)

    // Stage B: Hard reject
    const filtered = filterBlocked(candidates)
    if (filtered.length === 0) {
      console.log(`[polymarket] All candidates blocked for "${query}"`)
      return []
    }

    console.log(`[polymarket] Stage B: ${filtered.length} after blocking (removed ${candidates.length - filtered.length})`)

    // Stage C: Haiku relevance selection
    let selected: PolymarketCandidate[]
    if (articleContext) {
      selected = await selectMarketsWithHaiku(
        articleContext.title,
        articleContext.thesis,
        articleContext.articleType,
        filtered,
        articleContext.articleId,
      )
    } else {
      // No article context — return top 2 by volume (legacy fallback)
      selected = filtered
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 2)
    }

    return selected.map(({ id: _id, ...rest }) => ({
      ...rest,
      source: 'polymarket' as const,
    }))
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[polymarket] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
