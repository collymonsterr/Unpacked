import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Support both UUID id and slug lookup
  const isUUID = /^[0-9a-f-]{36}$/i.test(id)

  const query = getSupabaseAdmin().from('articles').select('*')
  const { data, error } = isUUID
    ? await query.eq('id', id).single()
    : await query.eq('slug', id).single()

  if (error || !data) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  return Response.json(data)
}
