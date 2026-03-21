import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { article_ids } = await request.json()

    if (!Array.isArray(article_ids) || article_ids.length === 0) {
      return Response.json({ error: 'No article IDs provided' }, { status: 400 })
    }

    // Limit to 50 articles per claim to prevent abuse
    const ids = article_ids.slice(0, 50)

    // Claim articles that have no owner
    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .update({
        user_id: user.id,
        user_name: user.user_metadata?.full_name ?? null,
        user_avatar: user.user_metadata?.avatar_url ?? null,
      })
      .in('id', ids)
      .is('user_id', null)
      .select('id')

    if (error) throw error

    return Response.json({ claimed: data?.length ?? 0 })
  } catch (err) {
    console.error('[claim]', err)
    return Response.json({ error: 'Failed to claim articles' }, { status: 500 })
  }
}
