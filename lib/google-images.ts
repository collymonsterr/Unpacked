/**
 * Google Images Integration via SerpAPI
 *
 * Primary image source for the pipeline. Replicates how a human sources an
 * image: search the best index (Google Images) for the literal subject and
 * pick from real, ranked, web-wide results — not generic stock libraries.
 *
 * Uses the SAME SERPAPI_KEY already configured for Google Trends
 * (lib/data-sources/google-trends.ts) — no new account or key required.
 *
 * Gracefully returns an empty array if the key is missing or the request
 * fails, so the router falls through to Pexels/Unsplash/Brave.
 */

import type { ImageCandidate } from '@/lib/image-router'

const SERPAPI_URL = 'https://serpapi.com/search'

interface SerpImageResult {
  position?: number
  thumbnail?: string
  original?: string
  original_width?: number
  original_height?: number
  title?: string
  link?: string
  source?: string
}

/**
 * Search Google Images for photos matching a query.
 * Returns ImageCandidate[] (largest-first) or [] on missing key / failure.
 *
 * Each candidate carries BOTH the full-resolution `url` (used for the final
 * hero) and a small `thumbnail` (used for cheap/fast vision selection).
 */
export async function searchGoogleImages(
  query: string,
  options?: {
    count?: number
    /** Bias toward larger images. Defaults to true. */
    largeOnly?: boolean
  },
): Promise<ImageCandidate[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    console.warn('[google-images] SERPAPI_KEY not configured — skipping')
    return []
  }
  if (!query || query.trim().length < 2) return []

  const count = options?.count ?? 10
  const largeOnly = options?.largeOnly ?? true

  try {
    const params = new URLSearchParams({
      engine: 'google_images',
      q: query.trim(),
      api_key: apiKey,
      safe: 'active',
    })
    // Bias toward large images — filters out tiny thumbnails/icons at source.
    if (largeOnly) params.set('tbs', 'isz:l')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${SERPAPI_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[google-images] SerpAPI error ${res.status}`)
      return []
    }

    const data = await res.json()
    const results: SerpImageResult[] = Array.isArray(data?.images_results)
      ? data.images_results
      : []

    if (results.length === 0) {
      console.warn(`[google-images] No results for "${query.slice(0, 40)}"`)
      return []
    }

    const candidates: ImageCandidate[] = []
    const seen = new Set<string>()

    for (const r of results) {
      const url = r.original
      if (!url || seen.has(url)) continue
      // Must be a usable full image URL, not a data: thumbnail or page link.
      if (!/^https?:\/\//i.test(url)) continue
      seen.add(url)

      candidates.push({
        url,
        thumbnail: r.thumbnail || url,
        source: 'google',
        alt: r.title || query,
        width: Number(r.original_width) || 0,
        height: Number(r.original_height) || 0,
      })

      if (candidates.length >= count) break
    }

    console.log(`[google-images] "${query.slice(0, 40)}": ${candidates.length} candidates`)
    return candidates
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[google-images] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
