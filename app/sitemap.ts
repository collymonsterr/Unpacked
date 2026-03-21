import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: 'https://articleai-three.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('slug, updated_at, created_at')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(500)

    if (data) {
      for (const row of data) {
        entries.push({
          url: `https://articleai-three.vercel.app/article/${row.slug}`,
          lastModified: new Date(row.updated_at ?? row.created_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }
  } catch {
    // Return at least the homepage
  }

  return entries
}
