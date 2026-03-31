/**
 * Pexels API Integration (Session 1.7D)
 *
 * Free, high-quality editorial stock photos.
 * Rate limit: 200 requests/hour (free tier).
 * Attribution appreciated but not legally required.
 *
 * If PEXELS_API_KEY is not configured, all functions return empty arrays
 * so the system falls back to the next image source gracefully.
 */

import type { ImageCandidate } from '@/lib/image-router'

interface PexelsPhoto {
  id: number
  url: string
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    landscape: string
  }
  alt: string
  width: number
  height: number
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
  total_results: number
}

/**
 * Search Pexels for photos matching a query.
 * Returns empty array if API key is not configured or request fails.
 */
export async function searchPexels(
  query: string,
  options?: {
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
  },
): Promise<ImageCandidate[]> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(options?.perPage ?? 6),
      orientation: options?.orientation ?? 'landscape',
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[pexels] API error ${response.status}`)
      return []
    }

    const data = (await response.json()) as PexelsSearchResponse
    const photos = data.photos ?? []

    return photos.map(photo => ({
      url: photo.src.large2x || photo.src.large || photo.src.original,
      source: 'pexels' as const,
      alt: photo.alt || query,
      width: photo.width,
      height: photo.height,
      attribution: {
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        source_name: 'Pexels',
      },
    }))
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[pexels] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
