/**
 * Google Trends Integration via SerpAPI (Session 1.7E)
 *
 * Fetches 12-month search interest timeline for a query.
 * Requires SERPAPI_KEY environment variable.
 *
 * Returns timeline data, trend direction, and peak/current interest.
 * Gracefully returns null if key is missing or API fails.
 */

export interface GoogleTrendsResult {
  query: string
  timelineData: Array<{ date: string; value: number }>
  averageInterest: number
  peakInterest: { date: string; value: number }
  currentInterest: number
  trend: 'rising' | 'declining' | 'stable' | 'peaking'
  changePercent: number
  url: string
  source: 'google_trends'
}

const SERPAPI_URL = 'https://serpapi.com/search'

/**
 * Fetch 12-month Google Trends data for a query.
 * Returns null if SERPAPI_KEY is not configured or API fails.
 */
export async function fetchGoogleTrends(query: string): Promise<GoogleTrendsResult | null> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    console.warn('[google-trends] SERPAPI_KEY not configured — skipping')
    return null
  }
  if (!query || query.length < 2) return null

  try {
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: query,
      date: 'today 12-m',
      data_type: 'TIMESERIES',
      api_key: apiKey,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${SERPAPI_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[google-trends] SerpAPI error ${res.status}`)
      return null
    }

    const data = await res.json()

    // Parse timeline data from SerpAPI response
    const interestOverTime = data?.interest_over_time?.timeline_data
    if (!Array.isArray(interestOverTime) || interestOverTime.length === 0) {
      console.warn('[google-trends] No timeline data returned')
      return null
    }

    const timelineData: Array<{ date: string; value: number }> = interestOverTime.map(
      (point: Record<string, unknown>) => {
        const date = String(point.date ?? '')
        // SerpAPI returns values as array of objects with extracted_value
        const values = point.values as Array<Record<string, unknown>> | undefined
        const value = values?.[0]?.extracted_value
          ? Number(values[0].extracted_value)
          : 0
        return { date, value }
      },
    )

    // Compute stats
    const values = timelineData.map(d => d.value)
    const average = values.reduce((a, b) => a + b, 0) / values.length
    const maxValue = Math.max(...values)
    const maxIndex = values.indexOf(maxValue)
    const current = values[values.length - 1] ?? 0

    // Compute trend: compare last 3 months vs previous 3 months
    const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3
    const previousAvg = values.length >= 6
      ? values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
      : average

    const changePercent = previousAvg > 0
      ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
      : 0

    let trend: GoogleTrendsResult['trend']
    if (maxIndex >= values.length - 2 && changePercent > 10) {
      trend = 'peaking'
    } else if (changePercent > 15) {
      trend = 'rising'
    } else if (changePercent < -15) {
      trend = 'declining'
    } else {
      trend = 'stable'
    }

    return {
      query,
      timelineData,
      averageInterest: Math.round(average),
      peakInterest: {
        date: timelineData[maxIndex]?.date ?? '',
        value: maxValue,
      },
      currentInterest: current,
      trend,
      changePercent,
      url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&date=today%2012-m`,
      source: 'google_trends',
    }
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[google-trends] Failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return null
  }
}
