export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleRow, ProductCard } from '@/types/article'
import type { LinkableArticle } from '@/lib/internal-links'
import { generateArticleJsonLd, generateProductJsonLd, generateBreadcrumbJsonLd, generateClaimReviewJsonLd, generateVerdictReviewJsonLd } from '@/lib/structured-data'
import ArticlePageClient from './ArticlePageClient'

// Cache internal links data (1 hour) — avoids DB call on every page load
let cachedLinkArticles: LinkableArticle[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 3600 * 1000 // 1 hour

async function getLinkableArticles(excludeSlug: string): Promise<LinkableArticle[]> {
  const now = Date.now()
  if (cachedLinkArticles && now - cacheTimestamp < CACHE_TTL) {
    return cachedLinkArticles.filter(a => a.slug !== excludeSlug)
  }
  try {
    const db = getSupabaseAdmin()
    const { data } = await db
      .from('articles')
      .select('slug, article')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(50)
    cachedLinkArticles = (data ?? []).map(r => ({
      title: (r.article as Record<string, unknown>)?.title as string ?? '',
      slug: r.slug as string,
    })).filter(a => a.title && a.slug)
    cacheTimestamp = now
    return cachedLinkArticles.filter(a => a.slug !== excludeSlug)
  } catch {
    return []
  }
}

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

  // Visibility gate — private articles are only accessible to owner or admin
  const visibility = row.visibility ?? 'published' // treat legacy null as published
  if (visibility === 'private') {
    try {
      const { createServerSupabase } = await import('@/lib/supabase')
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = !!(user?.email && adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase())
      const isOwner = user && user.id === row.user_id
      if (!isOwner && !isAdmin) notFound()
    } catch {
      notFound()
    }
  }
  // 'unlisted' = accessible to anyone with the URL, not listed publicly — no gate needed
  // 'published' = fully public — no gate needed

  // JSON-LD structured data
  const jsonLdScripts: Record<string, unknown>[] = []
  if (row.article) {
    jsonLdScripts.push(generateArticleJsonLd(row.article, row.slug, row.created_at, row.updated_at, {
      authorName: row.user_name,
      verifiedAt: row.verified_at,
    }))
    jsonLdScripts.push(generateBreadcrumbJsonLd(row.article.title, row.slug))

    // Add product schema for the top pick
    const topProduct = row.article.sections.find(
      (s): s is ProductCard => s.type === 'product_card'
    )
    if (topProduct) {
      jsonLdScripts.push(generateProductJsonLd(topProduct, row.article.title, row.slug))
    }

    // Add ClaimReview schema for each fact-check correction
    if (row.fact_check?.issues_found && row.fact_check.issues.length > 0) {
      const canonicalUrl = `https://unpacked.fyi/article/${row.slug}`
      const claimReviews = generateClaimReviewJsonLd(row.fact_check, canonicalUrl)
      jsonLdScripts.push(...claimReviews)
    }

    // Add Review schema from the editorial verdict
    const verdictReview = generateVerdictReviewJsonLd(row.article, row.slug)
    if (verdictReview) {
      jsonLdScripts.push(verdictReview)
    }
  }

  // Fetch linkable articles for inline internal links
  const linkableArticles = await getLinkableArticles(row.slug)

  // Fetch creator profile (bio + social links) for the author block
  let creatorBio: string | undefined
  let creatorTwitterUrl: string | undefined
  let creatorLinkedinUrl: string | undefined
  let creatorMediumUrl: string | undefined
  let isFoundingCreator = false
  if (row.user_id) {
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('bio, twitter_url, linkedin_url, medium_url, is_founding_creator')
      .eq('id', row.user_id)
      .single()
    creatorBio = profile?.bio || undefined
    creatorTwitterUrl = profile?.twitter_url || undefined
    creatorLinkedinUrl = profile?.linkedin_url || undefined
    creatorMediumUrl = profile?.medium_url || undefined
    isFoundingCreator = profile?.is_founding_creator === true
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
      <ArticlePageClient initialRow={row} linkableArticles={linkableArticles} creatorBio={creatorBio} creatorTwitterUrl={creatorTwitterUrl} creatorLinkedinUrl={creatorLinkedinUrl} creatorMediumUrl={creatorMediumUrl} isFoundingCreator={isFoundingCreator} />
    </>
  )
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)

  if (!row) return {}

  const title = row.article?.title ?? row.plan?.title ?? row.query
  const rawDesc = row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? ''
  const description = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc
  const canonicalUrl = `https://unpacked.fyi/article/${row.slug}`
  const ogImage = row.article?.thumbnail_url ?? `https://unpacked.fyi/api/og/${row.slug}`

  return {
    title: `${title} | Unpacked`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Unpacked',
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
      site: '@unpacked_fyi',
    },
  }
}
