import { NextRequest } from 'next/server'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { rating, reason } = body

  if (!rating || !['up', 'down'].includes(rating)) {
    return Response.json({ error: 'Invalid rating' }, { status: 400 })
  }

  // Get user if authenticated
  let userId: string | undefined
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {}

  const db = getSupabaseAdmin()

  // Check if user already voted (by user_id)
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
      rating,
      reason: rating === 'down' && reason ? reason : null,
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
  const db = getSupabaseAdmin()

  const { data } = await db
    .from('article_feedback')
    .select('rating, reason')
    .eq('article_id', id)

  const up = data?.filter(f => f.rating === 'up').length ?? 0
  const down = data?.filter(f => f.rating === 'down').length ?? 0
  const reasons = data?.filter(f => f.reason).map(f => f.reason) ?? []

  return Response.json({ up, down, reasons })
}
