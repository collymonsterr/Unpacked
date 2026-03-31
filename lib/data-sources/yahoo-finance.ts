/**
 * Yahoo Finance Integration (Session 1.7E)
 *
 * Fetches stock/market quotes from Yahoo Finance's unofficial API.
 * No API key required. Rate limits apply — built defensively.
 *
 * Includes a simple in-memory cache (5-minute TTL) to avoid
 * repeated requests for the same symbol.
 */

export interface YahooFinanceResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  url: string
  source: 'yahoo_finance'
}

const YAHOO_CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart'
const YAHOO_SEARCH_API = 'https://query1.finance.yahoo.com/v1/finance/search'

// Simple in-memory cache — 5 minute TTL
const cache = new Map<string, { data: YahooFinanceResult; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCached(symbol: string): YahooFinanceResult | null {
  const entry = cache.get(symbol)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(symbol)
    return null
  }
  return entry.data
}

function setCache(symbol: string, data: YahooFinanceResult): void {
  cache.set(symbol, { data, expires: Date.now() + CACHE_TTL })
}

/**
 * Fetch quotes for the given symbols.
 * Fetches in parallel, skips failures per-symbol.
 */
export async function fetchQuotes(symbols: string[]): Promise<YahooFinanceResult[]> {
  if (!symbols || symbols.length === 0) return []

  const results = await Promise.all(
    symbols.slice(0, 5).map(s => fetchSingleQuote(s))
  )

  return results.filter((r): r is YahooFinanceResult => r !== null)
}

async function fetchSingleQuote(symbol: string): Promise<YahooFinanceResult | null> {
  if (!symbol) return null

  // Check cache first
  const cached = getCached(symbol)
  if (cached) return cached

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${YAHOO_CHART_API}/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Unpacked/1.0)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[yahoo-finance] API error ${res.status} for ${symbol}`)
      return null
    }

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    if (!meta) return null

    const price = meta.regularMarketPrice ?? 0
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    const currency = meta.currency ?? 'USD'
    const name = meta.shortName ?? meta.longName ?? meta.symbol ?? symbol

    const quote: YahooFinanceResult = {
      symbol: symbol.toUpperCase(),
      name,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      source: 'yahoo_finance',
    }

    setCache(symbol, quote)
    return quote
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[yahoo-finance] Failed for ${symbol}${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return null
  }
}

/**
 * Search Yahoo Finance for symbols related to a query.
 * Returns up to 3 symbol strings.
 */
export async function searchFinanceSymbols(query: string): Promise<string[]> {
  if (!query || query.length < 2) return []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const params = new URLSearchParams({ q: query, quotesCount: '5', newsCount: '0' })
    const res = await fetch(`${YAHOO_SEARCH_API}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Unpacked/1.0)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return []

    const data = await res.json()
    const quotes = data?.quotes ?? []

    return quotes
      .filter((q: Record<string, unknown>) => q.symbol && q.quoteType !== 'MUTUALFUND')
      .slice(0, 3)
      .map((q: Record<string, unknown>) => String(q.symbol))
  } catch (err) {
    console.warn(`[yahoo-finance] Search failed: ${(err as Error).message}`)
    return []
  }
}
