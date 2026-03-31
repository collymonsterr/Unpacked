/**
 * Unsplash API Integration (Session 1.7D)
 *
 * Free, high-quality stock photography. Fallback for Pexels.
 * Rate limit: 50 requests/hour (demo), 5000/hour (production).
 * Attribution required: link back to photographer.
 *
 * If UNSPLASH_ACCESS_KEY is not configured, all functions return empty arrays
 * so the system falls back to the next image source gracefully.
 */

import type { ImageCandidate } from '@/lib/image-router'

interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  description: string | null
  user: {
    name: string
    links: { html: string }
  }
  width: number
  height: number
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[]
  total: number
}

/**
 * Search Unsplash for photos matching a query.
 * Returns empty array if API key is not configured or request fails.
 */
export async function searchUnsplash(
  query: string,
  options?: {
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'squarish'
  },
): Promise<ImageCandidate[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return []

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(options?.perPage ?? 6),
      orientation: options?.orientation ?? 'landscape',
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[unsplash] API error ${response.status}`)
      return []
    }

    const data = (await response.json()) as UnsplashSearchResponse
    const photos = data.results ?? []

    return photos.map(photo => ({
      url: photo.urls.regular || photo.urls.full,
      source: 'unsplash' as const,
      alt: photo.alt_description || photo.description || query,
      width: photo.width,
      height: photo.height,
      attribution: {
        photographer: photo.user.name,
        photographer_url: photo.user.links.html,
        source_name: 'Unsplash',
      },
    }))
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[unsplash] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}
