import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/category-config'
import { isIndexableSlug } from '@/lib/seo-canonical'
import { DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'

// Crawlers request this constantly and it reads 500 rows. Rebuild hourly.
export const revalidate = 3600

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

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    // The sitemap is generated at BUILD time, so a hanging query here fails the
    // whole deployment — it did on 3 Nov 2026, three 60s attempts against an
    // unresponsive database. abortSignal alone did not release it, so the
    // withTimeout race is the guarantee: a partial sitemap beats no deploy.
    const query = getSupabaseAdmin()
      .from('articles')
      .select('slug, updated_at, created_at')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(500)
      .abortSignal(dbSignal())

    const { data } = await withTimeout(query, DB_TIMEOUT_MS, 'sitemap articles', { data: [] } as never)

    if (data) {
      // Redirected duplicates, noindexed pages and pipeline debris are never
      // submitted for indexing — see lib/seo-canonical.ts.
      for (const row of data.filter(r => isIndexableSlug(r.slug))) {
        entries.push({
          url: `https://unpacked.fyi/article/${row.slug}`,
          lastModified: new Date(row.updated_at ?? row.created_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }
  } catch {
    // Return at least the homepage
  }

  return entries
}
