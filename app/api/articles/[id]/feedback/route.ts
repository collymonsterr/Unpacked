import { NextRequest } from 'next/server'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const body = await request.json()
  const { vote, reasons, comment } = body

  if (!vote || !['good', 'needs_work'].includes(vote)) {
    return Response.json({ error: 'Invalid vote' }, { status: 400 })
  }

  // Get user if authenticated
  let userId: string | undefined
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {}

  const db = getSupabaseAdmin()

  // Prevent duplicate votes from authenticated users
  if (userId) {
    const { data: existing } = await db
      .from('article_feedback')
      .select('id')
      .eq('article_id', id)
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (existing) {
      return Response.json({ error: 'Already voted' }, { status: 409 })
    }
  }

  const { error } = await db
    .from('article_feedback')
    .insert({
      article_id: id,
      user_id: userId ?? null,
      vote,
      reasons: vote === 'needs_work' && Array.isArray(reasons) ? reasons : null,
      comment: vote === 'needs_work' && typeof comment === 'string' ? comment.slice(0, 500) : null,
    })

  if (error) {
    console.error('[feedback] Insert error:', error.message)
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  // Check if current user already voted
  let hasVoted = false
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const db = getSupabaseAdmin()
      const { data } = await db
        .from('article_feedback')
        .select('id')
        .eq('article_id', id)
        .eq('user_id', user.id)
        .limit(1)
        .single()
      hasVoted = !!data
    }
  } catch {}

  return Response.json({ hasVoted })
}
