import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID, parseBody } from '@/lib/validate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

    const auth = await requireAdmin()
    if (!auth.authorized) return auth.error!

    const body = await parseBody(request)
    if (!body || typeof body.hidden !== 'boolean') {
      return Response.json({ error: 'hidden (boolean) is required' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from('articles')
      .update({ hidden_from_homepage: body.hidden })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Failed to update' }, { status: 500 })
    }

    return Response.json({ hidden: body.hidden })
  } catch (err) {
    console.error('[article-hide]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
