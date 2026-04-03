import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ count: -1 })
    }

    const { count, error } = await getSupabaseAdmin()
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['complete', 'verified', 'generating', 'awaiting_auth'])

    if (error) {
      return Response.json({ count: -1 })
    }

    return Response.json({ count: count ?? 0 })
  } catch {
    return Response.json({ count: -1 })
  }
}
