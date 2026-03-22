import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID, parseBody } from '@/lib/validate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const body = await parseBody(request)
  if (!body || typeof body.pinned !== 'boolean') {
    return Response.json({ error: 'pinned (boolean) is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('articles')
    .update({ pinned: body.pinned })
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update pin status' }, { status: 500 })
  }

  return Response.json({ pinned: body.pinned })
}
