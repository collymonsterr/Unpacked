import { getSupabaseAdmin } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/category-config'

const MIN_ARTICLES = 5

export async function GET() {
  try {
    const db = getSupabaseAdmin()

    // Count published articles per category
    const { data, error } = await db
      .from('articles')
      .select('category')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .not('category', 'is', null)

    if (error || !data) {
      // Fallback: return all categories
      return Response.json(
        { categories: CATEGORIES.map(c => ({ slug: c.slug, name: c.name, count: 0 })) },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } }
      )
    }

    // Count per dbValue
    const counts: Record<string, number> = {}
    for (const row of data) {
      if (row.category) {
        counts[row.category] = (counts[row.category] ?? 0) + 1
      }
    }

    // Map to category configs with counts, filter by threshold
    const active = CATEGORIES
      .map(c => ({
        slug: c.slug,
        name: c.name,
        dbValue: c.dbValue,
        count: counts[c.dbValue] ?? 0,
      }))
      .filter(c => c.count >= MIN_ARTICLES)

    return Response.json(
      { categories: active },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } }
    )
  } catch {
    // Fallback: return all categories
    return Response.json(
      { categories: CATEGORIES.map(c => ({ slug: c.slug, name: c.name, count: 0 })) },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } }
    )
  }
}
