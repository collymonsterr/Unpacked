export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleRow, ProductCard } from '@/types/article'
import { generateArticleJsonLd, generateProductJsonLd, generateBreadcrumbJsonLd } from '@/lib/structured-data'
import ArticlePageClient from './ArticlePageClient'

interface Props {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<ArticleRow | null> {
  // Support UUID or slug
  const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
  const db = getSupabaseAdmin()

  if (isUUID) {
    const { data } = await db.from('articles').select('*').eq('id', slug).single()
    return (data as ArticleRow) ?? null
  }

  // Try exact slug match first
  const { data } = await db.from('articles').select('*').eq('slug', slug).single()
  if (data) return data as ArticleRow

  // Fallback: the slug might have been updated after the client navigated
  // Search by the query-based slug pattern in case the article was renamed
  const { data: fuzzy } = await db
    .from('articles')
    .select('*')
    .ilike('slug', `${slug.slice(0, 30)}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (fuzzy as ArticleRow) ?? null
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)

  if (!row) notFound()

  // JSON-LD structured data
  const jsonLdScripts: Record<string, unknown>[] = []
  if (row.article) {
    jsonLdScripts.push(generateArticleJsonLd(row.article, row.slug, row.created_at, row.updated_at))
    jsonLdScripts.push(generateBreadcrumbJsonLd(row.article.title, row.slug))

    // Add product schema for the top pick
    const topProduct = row.article.sections.find(
      (s): s is ProductCard => s.type === 'product_card'
    )
    if (topProduct) {
      jsonLdScripts.push(generateProductJsonLd(topProduct, row.article.title, row.slug))
    }
  }

  // isOwner is determined client-side via localStorage (no auth for MVP)
  return (
    <>
      {jsonLdScripts.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <ArticlePageClient initialRow={row} />
    </>
  )
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)

  if (!row) return {}

  const title = row.article?.title ?? row.plan?.title ?? row.query
  const description = row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? ''
  const canonicalUrl = `https://articleai-three.vercel.app/article/${row.slug}`
  const ogImage = row.article?.thumbnail_url ?? `https://articleai-three.vercel.app/api/og/${row.slug}`

  return {
    title: `${title} — ArticleAI`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'ArticleAI',
      type: 'article',
      publishedTime: row.created_at,
      modifiedTime: row.updated_at ?? row.created_at,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@articleai',
    },
  }
}
