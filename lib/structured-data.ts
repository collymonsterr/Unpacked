import type { ArticleContent, ProductCard, FactCheckResult } from '@/types/article'

export function generateArticleJsonLd(
  article: ArticleContent,
  slug: string,
  createdAt: string,
  updatedAt?: string,
  options?: {
    authorName?: string | null
    verifiedAt?: string | null
  }
) {
  const canonicalUrl = `https://unpacked.fyi/article/${slug}`

  // Build author array — always include the Org; add Person when user_name present
  const authors: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      name: 'Unpacked',
      url: 'https://unpacked.fyi',
    },
  ]
  if (options?.authorName) {
    authors.push({
      '@type': 'Person',
      name: options.authorName,
    })
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description:
      article.executive_summary?.short_answer ??
      article.quick_verdict?.one_liner ??
      '',
    url: canonicalUrl,
    datePublished: createdAt,
    dateModified: updatedAt ?? createdAt,
    author: authors.length === 1 ? authors[0] : authors,
    publisher: {
      '@type': 'Organization',
      name: 'Unpacked',
      url: 'https://unpacked.fyi',
      logo: {
        '@type': 'ImageObject',
        url: 'https://unpacked.fyi/android-chrome-192x192.png',
      },
    },
  }

  if (article.thumbnail_url) {
    jsonLd.image = article.thumbnail_url
  }

  // Add dateModified from verified_at when fact-checked — signals freshness to Google
  if (options?.verifiedAt) {
    jsonLd.dateModified = options.verifiedAt
  }

  return jsonLd
}

export function generateProductJsonLd(
  product: ProductCard,
  articleTitle: string,
  slug: string
) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.entity_name,
    description: product.opinion ?? product.verdict ?? '',
    url: `https://unpacked.fyi/article/${slug}`,
  }

  if (product.image_url ?? product.image_urls?.[0]) {
    jsonLd.image = product.image_url ?? product.image_urls?.[0]
  }

  if (product.price) {
    // Try to parse price like "$299" or "$1,299.99"
    const priceMatch = product.price.match(/[\d,]+\.?\d*/)
    if (priceMatch) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: priceMatch[0].replace(/,/g, ''),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      }
    }
  }

  if (product.verdict) {
    jsonLd.review = {
      '@type': 'Review',
      reviewBody: product.verdict,
      author: {
        '@type': 'Organization',
        name: 'Unpacked',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Unpacked',
      },
    }
  }

  return jsonLd
}

export function generateBreadcrumbJsonLd(articleTitle: string, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://unpacked.fyi',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: articleTitle,
        item: `https://unpacked.fyi/article/${slug}`,
      },
    ],
  }
}

/**
 * Generates ClaimReview schema for each corrected claim in a fact-check result.
 * Only call this when fact_check.issues_found is true and issues.length > 0.
 */
export function generateClaimReviewJsonLd(
  factCheck: FactCheckResult,
  articleUrl: string
): Record<string, unknown>[] {
  return factCheck.issues
    .filter(issue => issue.correction && issue.original_claim)
    .map(issue => ({
      '@context': 'https://schema.org',
      '@type': 'ClaimReview',
      url: articleUrl,
      claimReviewed: issue.original_claim,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: issue.severity === 'critical' ? '1' : '2',
        bestRating: '5',
        worstRating: '1',
        alternateName: issue.severity === 'critical' ? 'False' : 'Mostly False',
      },
      author: {
        '@type': 'Organization',
        name: 'Unpacked',
        url: 'https://unpacked.fyi',
      },
    }))
}

/**
 * Generates a Review schema from the article's quick_verdict.
 * Represents Unpacked's editorial verdict on the article's subject.
 */
export function generateVerdictReviewJsonLd(
  article: ArticleContent,
  slug: string
): Record<string, unknown> | null {
  if (!article.quick_verdict?.one_liner) return null

  const canonicalUrl = `https://unpacked.fyi/article/${slug}`

  // Prefer recommendation field (legacy winner name), fall back to article title
  const itemName = article.quick_verdict.recommendation ?? article.title

  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    url: canonicalUrl,
    reviewBody: article.quick_verdict.one_liner,
    itemReviewed: {
      '@type': 'Thing',
      name: itemName,
    },
    author: {
      '@type': 'Organization',
      name: 'Unpacked',
      url: 'https://unpacked.fyi',
    },
  }
}
