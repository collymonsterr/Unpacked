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
  /** Daily close prices for sparkline chart (most recent last) */
  sparkline?: number[]
  /** Timeframe of the sparkline data */
  timeframe?: '1d' | '1m' | '3m' | '6m'
  /** Change over the sparkline period (first to last data point) */
  periodChange?: number
  /** Percentage change over the sparkline period */
  periodChangePercent?: number
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

/** Map planner timeframe to Yahoo Finance API range and interval */
const TIMEFRAME_MAP: Record<string, { range: string; interval: string; label: string }> = {
  '1d': { range: '1d', interval: '5m', label: 'Today' },
  '1m': { range: '1mo', interval: '1d', label: '1 month' },
  '3m': { range: '3mo', interval: '1d', label: '3 months' },
  '6m': { range: '6mo', interval: '1d', label: '6 months' },
}

/**
 * Fetch quotes for the given symbols.
 * Fetches in parallel, skips failures per-symbol.
 */
export async function fetchQuotes(symbols: string[], timeframe?: string): Promise<YahooFinanceResult[]> {
  if (!symbols || symbols.length === 0) return []

  // Deduplicate symbols (case-insensitive) — same company can appear via multiple queries
  const seen = new Set<string>()
  const uniqueSymbols = symbols.filter(s => {
    const upper = s.toUpperCase()
    if (seen.has(upper)) return false
    seen.add(upper)
    return true
  })

  const tf = timeframe && TIMEFRAME_MAP[timeframe] ? timeframe : '1m'

  const results = await Promise.all(
    uniqueSymbols.slice(0, 5).map(s => fetchSingleQuote(s, tf))
  )

  return results.filter((r): r is YahooFinanceResult => r !== null)
}

async function fetchSingleQuote(symbol: string, timeframe: string = '1m'): Promise<YahooFinanceResult | null> {
  if (!symbol) return null

  // Check cache first (cache key includes timeframe)
  const cacheKey = `${symbol}:${timeframe}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const tf = TIMEFRAME_MAP[timeframe] ?? TIMEFRAME_MAP['1m']

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${YAHOO_CHART_API}/${encodeURIComponent(symbol)}?range=${tf.range}&interval=${tf.interval}`,
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
    // Skip symbols that returned no real price data (invalid ticker or no market data)
    if (price <= 0) {
      console.warn(`[yahoo-finance] Skipping ${symbol}: price is $${price}`)
      return null
    }
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    const currency = meta.currency ?? 'USD'
    const name = meta.shortName ?? meta.longName ?? meta.symbol ?? symbol

    // Extract sparkline from chart close prices
    let sparkline: number[] | undefined
    let periodChange: number | undefined
    let periodChangePercent: number | undefined
    try {
      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
      const validCloses = closes.filter((c): c is number => c !== null && c > 0)
      if (validCloses.length >= 3) {
        sparkline = validCloses
        // Calculate period change from first to last sparkline data point
        const firstClose = validCloses[0]
        const lastClose = validCloses[validCloses.length - 1]
        periodChange = Math.round((lastClose - firstClose) * 100) / 100
        periodChangePercent = firstClose > 0
          ? Math.round(((lastClose - firstClose) / firstClose) * 10000) / 100
          : 0
      }
    } catch {
      // Sparkline is optional — don't fail the whole quote
    }

    const quote: YahooFinanceResult = {
      symbol: symbol.toUpperCase(),
      name,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      source: 'yahoo_finance',
      sparkline,
      timeframe: timeframe as YahooFinanceResult['timeframe'],
      periodChange,
      periodChangePercent,
    }

    setCache(cacheKey, quote)
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
