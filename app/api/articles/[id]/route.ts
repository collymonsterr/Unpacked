import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Support both UUID id and slug lookup
  const isUUID = /^[0-9a-f-]{36}$/i.test(id)

  const db = getSupabaseAdmin()
  let data
  if (isUUID) {
    const res = await db.from('articles').select('*').eq('id', id).single()
    data = res.data
  } else {
    // Use maybeSingle to handle potential duplicate slugs gracefully
    const res = await db.from('articles').select('*').eq('slug', id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    data = res.data
  }

  if (!data) {
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
