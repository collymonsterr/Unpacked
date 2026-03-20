import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('articles')
    .select('id, slug, query, status, plan, article, pinned, created_at')
    .eq('status', 'complete')
    .order('pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  // Sort by sort_order (stored in article JSONB), then by created_at
  const articles = (data ?? []).sort((a, b) => {
    // Pinned first
    const aPinned = a.pinned ? 1 : 0
    const bPinned = b.pinned ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned

    // Then by sort_order (lower = higher position)
    const aOrder = (a.article as Record<string, unknown>)?.sort_order as number | undefined
    const bOrder = (b.article as Record<string, unknown>)?.sort_order as number | undefined
    if (aOrder != null && bOrder != null) return aOrder - bOrder
    if (aOrder != null) return -1
    if (bOrder != null) return 1

    // Finally by created_at descending
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return Response.json(articles)
}
