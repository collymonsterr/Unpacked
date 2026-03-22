import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const { pinned } = await request.json()

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('articles')
    .update({ pinned: !!pinned })
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update pin status' }, { status: 500 })
  }

  return Response.json({ pinned: !!pinned })
}
