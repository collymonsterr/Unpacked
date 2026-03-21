import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

// GET — list saved article IDs for current user (or full articles with ?full=true)
export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const url = new URL(req.url)
  const full = url.searchParams.get('full') === 'true'

  if (full) {
    // Return full article rows for the dashboard saved tab
    const { data, error } = await getSupabaseAdmin()
      .from('saved_articles')
      .select('article_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Failed to fetch saved articles' }, { status: 500 })
    }

    const articleIds = (data ?? []).map(s => s.article_id)
    if (articleIds.length === 0) {
      return Response.json([])
    }

    const { data: articles } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, query, status, plan, article, pinned, view_count, created_at')
      .in('id', articleIds)
      .in('status', ['complete', 'verified'])

    // Preserve saved order
    const articleMap = new Map((articles ?? []).map(a => [a.id, a]))
    const ordered = articleIds.map(id => articleMap.get(id)).filter(Boolean)

    return Response.json(ordered)
  }

  // Just return IDs for checking saved state
  const { data, error } = await getSupabaseAdmin()
    .from('saved_articles')
    .select('article_id')
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return Response.json((data ?? []).map(s => s.article_id))
}

// POST — toggle save/unsave
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { article_id } = await req.json()
  if (!article_id) {
    return Response.json({ error: 'article_id required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Check if already saved
  const { data: existing } = await admin
    .from('saved_articles')
    .select('id')
    .eq('user_id', user.id)
    .eq('article_id', article_id)
    .single()

  if (existing) {
    // Unsave
    await admin.from('saved_articles').delete().eq('id', existing.id)
    return Response.json({ saved: false })
  } else {
    // Save
    const { error } = await admin
      .from('saved_articles')
      .insert({ user_id: user.id, article_id })

    if (error) {
      return Response.json({ error: 'Failed to save' }, { status: 500 })
    }
    return Response.json({ saved: true })
  }
}
