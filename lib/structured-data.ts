import type { ArticleContent, ProductCard } from '@/types/article'

export function generateArticleJsonLd(
  article: ArticleContent,
  slug: string,
  createdAt: string,
  updatedAt?: string
) {
  const canonicalUrl = `https://articleai-three.vercel.app/article/${slug}`

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
    author: {
      '@type': 'Organization',
      name: 'ArticleAI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ArticleAI',
      url: 'https://articleai-three.vercel.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://articleai-three.vercel.app/favicon-192.png',
      },
    },
  }

  if (article.thumbnail_url) {
    jsonLd.image = article.thumbnail_url
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
    url: `https://articleai-three.vercel.app/article/${slug}`,
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
        name: 'ArticleAI',
      },
      publisher: {
        '@type': 'Organization',
        name: 'ArticleAI',
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
        item: 'https://articleai-three.vercel.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: articleTitle,
        item: `https://articleai-three.vercel.app/article/${slug}`,
      },
    ],
  }
}
