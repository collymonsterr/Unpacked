export const dynamic = 'force-dynamic'

// Private articles check the session, so the route stays dynamic — but the row
// and the internal-link list are cached, so repeat views and crawlers do not
// each hit the database.
export const maxDuration = 20

import { unstable_cache } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleRow, ProductCard } from '@/types/article'
import type { LinkableArticle } from '@/lib/internal-links'
import { generateArticleJsonLd, generateProductJsonLd, generateBreadcrumbJsonLd, generateClaimReviewJsonLd, generateVerdictReviewJsonLd } from '@/lib/structured-data'
import { getCanonicalSlug, isIndexableSlug } from '@/lib/seo-canonical'
import { AUTH_TIMEOUT_MS, DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'
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
    // abortSignal alone has already proved insufficient elsewhere in this repo
    // (see the sitemap note in CLAUDE.md) — withTimeout is the guarantee.
    const { data } = await withTimeout(
      db
        .from('articles')
        .select('slug, title:article->>title')
        .in('status', ['complete', 'verified'])
        .eq('visibility', 'published')
        .order('view_count', { ascending: false })
        .limit(50)
        .abortSignal(dbSignal()),
      DB_TIMEOUT_MS,
      'internal link candidates',
      { data: [] } as never
    )
    cachedLinkArticles = (data ?? []).map(r => ({
      title: (r as { title?: string }).title ?? '',
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

/**
 * Fetch the row. Cached per slug: article bodies change rarely, and a crawler
 * re-reading the same URL should not re-read the database.
 *
 * Caching the ROW is safe — the visibility gate below still runs on every
 * request, against the live session. Only the data read is shared.
 */
const getArticleCached = unstable_cache(
  async (slug: string): Promise<ArticleRow | null> => {
    const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
    const db = getSupabaseAdmin()

    // Throw on error rather than returning null: a failed/aborted query must
    // never be cached as "this article does not exist".
    if (isUUID) {
      const { data, error } = await db
        .from('articles').select('*').eq('id', slug)
        .abortSignal(dbSignal())
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return (data as ArticleRow) ?? null
    }

    // Exact slug match — .limit(1) handles potential duplicate slugs gracefully
    const { data, error } = await db
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(dbSignal())
      .maybeSingle()
    if (error) throw error
    return (data as ArticleRow) ?? null
  },
  ['article-row-v1'],
  { revalidate: 300, tags: ['articles'] }
)

/**
 * A database stall must not look like a deleted article. `null` means "no such
 * article" (404); a timeout throws, which surfaces as a 5xx — the transient
 * signal crawlers retry instead of de-indexing the URL.
 */
const LOOKUP_TIMED_OUT = Symbol('lookup-timed-out')

async function getArticle(slug: string): Promise<ArticleRow | null> {
  const result = await withTimeout<ArticleRow | null | typeof LOOKUP_TIMED_OUT>(
    getArticleCached(slug),
    DB_TIMEOUT_MS,
    `article ${slug}`,
    LOOKUP_TIMED_OUT
  )
  if (result === LOOKUP_TIMED_OUT) {
    throw new Error(`Article lookup timed out for "${slug}" — database unavailable`)
  }
  return result
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  // Duplicate slugs 301 to their keeper before any DB work — the map is an
  // in-memory lookup, so this costs nothing on the common path.
  const canonicalSlug = getCanonicalSlug(slug)
  if (canonicalSlug !== slug) permanentRedirect(`/article/${canonicalSlug}`)

  const row = await getArticle(slug)

  if (!row) notFound()

  // Visibility gate — private articles are only accessible to owner or admin
  const visibility = row.visibility ?? 'published' // treat legacy null as published
  if (visibility === 'private') {
    try {
      const { createServerSupabase } = await import('@/lib/supabase')
      const supabase = await createServerSupabase()
      // Supabase Auth hangs too when the database is unhealthy. Falling back to
      // "no user" keeps a private article private, which is the safe direction.
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        'article visibility auth check',
        { data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>
      )
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
    // Bounded like every other page-path read. This one had neither a timeout
    // nor an abort signal and runs for every article that has an author, so a
    // stalled database pinned the whole function for its 20s maxDuration — the
    // article row itself is cached, this was the call that hung. A byline
    // without a bio is a fine degradation; a dead page is not.
    const { data: profile } = await withTimeout(
      getSupabaseAdmin()
        .from('profiles')
        .select('bio, twitter_url, linkedin_url, medium_url, is_founding_creator')
        .eq('id', row.user_id)
        .abortSignal(dbSignal())
        .single(),
      DB_TIMEOUT_MS,
      `creator profile ${row.user_id}`,
      { data: null } as never
    )
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
          // Escape `<` so untrusted string fields (e.g. user display_name) can't
          // break out of the <script> block with `</script><script>…`.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ld)
              .replace(/</g, '\\u003c')
              .replace(/\u2028/g, '\\u2028')
              .replace(/\u2029/g, '\\u2029'),
          }}
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

  // Don't leak metadata for private articles to unauthenticated users
  if (row.visibility === 'private') {
    try {
      const { createServerSupabase } = await import('@/lib/supabase')
      const supabase = await createServerSupabase()
      // Supabase Auth hangs too when the database is unhealthy. Falling back to
      // "no user" keeps a private article private, which is the safe direction.
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        'article visibility auth check',
        { data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>
      )
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = !!(user?.email && adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase())
      const isOwner = user && user.id === row.user_id
      if (!isOwner && !isAdmin) return {}
    } catch {
      return {}
    }
  }

  const title = row.article?.title ?? row.plan?.title ?? row.query
  const rawDesc = row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? ''
  const description = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc
  // Point the canonical at the keeper, so a duplicate reached directly still
  // hands its ranking signals to the surviving URL.
  const canonicalUrl = `https://unpacked.fyi/article/${getCanonicalSlug(row.slug)}`
  const ogImage = row.article?.thumbnail_url ?? `https://unpacked.fyi/api/og/${row.slug}`

  return {
    title: `${title} | Unpacked`,
    description,
    // Unlisted articles and the pages in NOINDEX_SLUGS stay reachable by link
    // but are kept out of the index; `follow` still passes link equity on.
    robots:
      row.visibility !== 'published' || !isIndexableSlug(row.slug)
        ? { index: false, follow: true }
        : undefined,
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
