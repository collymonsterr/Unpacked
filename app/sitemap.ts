import type { MetadataRoute } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { CATEGORIES } from '@/lib/category-config'
import { isIndexableSlug } from '@/lib/seo-canonical'
import { dbSignal, withTimeout } from '@/lib/db-timeout'

// Crawlers request this constantly and it reads 500 rows. Rebuild hourly.
export const revalidate = 3600

/**
 * The sitemap is a crawler endpoint, not a reader page, so it gets a far longer
 * budget than `DB_TIMEOUT_MS`: nobody is sitting in front of a blank screen
 * while it runs, and a *complete* sitemap matters more than a fast one. The 4s
 * reader budget was tight enough that a busy database produced an empty one.
 */
const SITEMAP_DB_TIMEOUT_MS = 15_000

/** Distinguishes "the database did not answer" from "there are no articles". */
const UNAVAILABLE = Symbol('sitemap-db-unavailable')

interface SitemapArticleRow {
  slug: string
  updated_at: string | null
  created_at: string
}

async function loadArticles(): Promise<SitemapArticleRow[] | typeof UNAVAILABLE> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    // The sitemap is generated at BUILD time, so a hanging query here fails the
    // whole deployment — it did on 3 Nov 2026, three 60s attempts against an
    // unresponsive database. abortSignal alone did not release it, so the
    // withTimeout race is the guarantee.
    const query = getSupabaseAdmin()
      .from('articles')
      .select('slug, updated_at, created_at')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(500)
      .abortSignal(dbSignal(SITEMAP_DB_TIMEOUT_MS))

    const result = await withTimeout<
      { data: SitemapArticleRow[] | null; error: unknown } | typeof UNAVAILABLE
    >(query as never, SITEMAP_DB_TIMEOUT_MS, 'sitemap articles', UNAVAILABLE)

    if (result === UNAVAILABLE || result.error || !result.data) return UNAVAILABLE
    return result.data
  } catch {
    return UNAVAILABLE
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: 'https://unpacked.fyi',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://unpacked.fyi/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://unpacked.fyi/creators',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://unpacked.fyi/invest',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Category pages
  for (const cat of CATEGORIES) {
    entries.push({
      url: `https://unpacked.fyi/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  const articles = await loadArticles()

  if (articles === UNAVAILABLE) {
    // A sitemap without the articles is not a degraded sitemap, it is a wrong
    // one — and `revalidate` would serve it as the truth for an hour. On 8 Nov
    // 2026 a deploy landed mid-Postgres-stall and published a sitemap listing
    // 16 URLs for a site with 293 published articles; Search Console began
    // reporting pages missing from the index.
    //
    // At runtime, throw: Next keeps serving the last good sitemap and retries
    // on the next revalidate, so Google never sees the truncated version.
    // At build time, returning the static entries keeps the deploy alive (the
    // whole point of the 3 Nov fix) and the hourly revalidate fills in the
    // articles as soon as the database answers again.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
      throw new Error('sitemap: database unavailable — keeping the previous sitemap')
    }
    return entries
  }

  // Redirected duplicates, noindexed pages and pipeline debris are never
  // submitted for indexing — see lib/seo-canonical.ts.
  for (const row of articles.filter(r => isIndexableSlug(r.slug))) {
    entries.push({
      url: `https://unpacked.fyi/article/${row.slug}`,
      lastModified: new Date(row.updated_at ?? row.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return entries
}
