import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('articles')
    .select('id, slug, query, status, plan, article, created_at')
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  return Response.json(data ?? [])
}
