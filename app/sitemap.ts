import type { MetadataRoute } from 'next'

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
  ]

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('slug, updated_at, created_at')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .limit(500)

    if (data) {
      for (const row of data) {
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
