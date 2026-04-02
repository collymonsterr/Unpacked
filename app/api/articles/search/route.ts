import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')

  if (!query || query.length < 2) {
    return Response.json({ results: [] })
  }

  const db = getSupabaseAdmin()

  // Sanitize query for ilike — escape special postgres characters
  const sanitized = query.replace(/[%_\\]/g, '\\$&')

  const { data } = await db
    .from('articles')
    .select('id, slug, title, category, view_count')
    .or(`title.ilike.%${sanitized}%,query.ilike.%${sanitized}%`)
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')
    .order('view_count', { ascending: false })
    .limit(5)

  return Response.json({ results: data ?? [] })
}
