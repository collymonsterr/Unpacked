import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

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

  // Gate private articles: only owner or admin may read
  if (data.visibility === 'private') {
    let sessionUserId: string | null = null
    let sessionEmail: string | null = null
    try {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      sessionUserId = user?.id ?? null
      sessionEmail = user?.email ?? null
    } catch {
      // fall through as anonymous
    }

    const adminId = process.env.ADMIN_USER_ID
    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin =
      (!!adminId && sessionUserId === adminId) ||
      (!!adminEmail && !!sessionEmail && sessionEmail.toLowerCase() === adminEmail.toLowerCase())
    const isOwner = !!sessionUserId && data.user_id === sessionUserId

    if (!isAdmin && !isOwner) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }
  }

  return Response.json(data)
}
