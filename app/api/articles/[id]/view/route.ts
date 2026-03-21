import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  // Read current count then increment (slightly racy but fine for view counts)
  const { data } = await supabase
    .from('articles')
    .select('view_count')
    .eq('id', id)
    .single()

  if (!data) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('articles')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to increment view' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
