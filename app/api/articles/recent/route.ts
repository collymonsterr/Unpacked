import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('articles')
    .select('id, slug, query, status, plan, article, pinned, hidden_from_homepage, sort_order, view_count, is_featured, featured_position, is_trending, trending_set_at, user_id, user_name, user_avatar, fact_check, verified_at, created_at, updated_at, suggestion_chips')
    .in('status', ['complete', 'verified'])
    .eq('hidden_from_homepage', false)
    .order('pinned', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  return Response.json(data ?? [])
}
