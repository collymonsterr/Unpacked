/**
 * Image Router (Session 1.7D)
 *
 * Determines which image source(s) to query based on article type,
 * image purpose, and style. Returns an ordered list of sources to try
 * (first = primary, rest = fallbacks).
 */

import type { ArticleType } from '@/lib/article-types'

export type ImageSource = 'pexels' | 'unsplash' | 'brave'
export type ImagePurpose = 'hero' | 'product' | 'editorial_section'

export interface ImageRequest {
  query: string
  purpose: ImagePurpose
  articleType: ArticleType
  style?: 'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract'
}

export interface ImageCandidate {
  url: string
  source: ImageSource
  alt: string
  width: number
  height: number
  attribution?: {
    photographer: string
    photographer_url: string
    source_name: string
  }
}

/**
 * Returns an ordered list of image sources to try for a given request.
 * First source is primary; the rest are fallbacks tried in order.
 */
export function routeImageRequest(request: ImageRequest): ImageSource[] {
  // Hero images
  if (request.purpose === 'hero') {
    // News needs real event photos — Brave is best for current events
    if (request.style === 'news_photo') return ['brave']
    // Products need actual product photos
    if (request.style === 'product_photo') return ['brave']
    // Everything else: editorial quality from Pexels/Unsplash, Brave fallback
    return ['pexels', 'unsplash', 'brave']
  }

  // Product images — Brave is best for specific product photos
  if (request.purpose === 'product') {
    return ['brave']
  }

  // Editorial section images
  if (request.purpose === 'editorial_section') {
    // News articles need real-world photos
    if (request.articleType === 'news_analysis' || request.articleType === 'breaking_news') {
      return ['brave']
    }
    return ['pexels', 'unsplash', 'brave']
  }

  return ['brave']
}

/**
 * Filter image candidates by basic quality criteria.
 * No vision model needed — just dimension and URL checks.
 */
export function filterImageCandidates(
  candidates: ImageCandidate[],
  purpose: ImagePurpose = 'hero',
): ImageCandidate[] {
  return candidates.filter(img => {
    // Minimum dimensions
    if (img.width > 0 && img.width < 800) return false
    if (img.height > 0 && img.height < 400) return false

    // Reject obviously bad URLs
    const url = img.url.toLowerCase()
    if (url.includes('placeholder')) return false
    if (url.includes('no-image')) return false
    if (url.includes('default-avatar')) return false

    // Prefer landscape for heroes
    if (purpose === 'hero' && img.width > 0 && img.height > 0 && img.width < img.height) {
      return false
    }

    return true
  })
}
