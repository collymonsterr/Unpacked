import { NextRequest } from 'next/server'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

const VALID_CATEGORIES = ['helpful', 'verdict'] as const
const VALID_VALUES: Record<string, string[]> = {
  helpful: ['helpful', 'not_helpful'],
  verdict: ['convinced', 'not_convinced'],
}

// POST /api/articles/[id]/vote
// Body: { vote_category, vote_value, session_id?, reason?, comment? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const body = await request.json()
  const { vote_category, vote_value, session_id, reason, comment } = body

  if (!VALID_CATEGORIES.includes(vote_category)) {
    return Response.json({ error: 'Invalid vote_category' }, { status: 400 })
  }
  if (!VALID_VALUES[vote_category]?.includes(vote_value)) {
    return Response.json({ error: 'Invalid vote_value for category' }, { status: 400 })
  }

  // Get user if authenticated
  let userId: string | null = null
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {}

  const db = getSupabaseAdmin()

  // Delete any existing vote for this (article, category, user/session) then insert fresh
  // This handles upsert without needing named partial index support in PostgREST
  if (userId) {
    await db
      .from('article_votes')
      .delete()
      .eq('article_id', id)
      .eq('vote_category', vote_category)
      .eq('user_id', userId)
  } else if (session_id && typeof session_id === 'string' && session_id.length > 0) {
    await db
      .from('article_votes')
      .delete()
      .eq('article_id', id)
      .eq('vote_category', vote_category)
      .eq('session_id', session_id)
  }

  const { error } = await db.from('article_votes').insert({
    article_id: id,
    vote_category,
    vote_value,
    user_id: userId ?? null,
    session_id: userId ? null : (session_id ?? null),
    reason: typeof reason === 'string' && reason.length > 0 ? reason : null,
    comment: typeof comment === 'string' && comment.length > 0 ? comment.slice(0, 140) : null,
  })

  if (error) {
    console.error('[vote] Insert error:', error.message)
    return Response.json({ error: 'Failed to save vote' }, { status: 500 })
  }

  return Response.json({ success: true })
}

// GET /api/articles/[id]/vote
// Returns aggregated vote counts for the article
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('article_votes')
    .select('vote_category, vote_value')
    .eq('article_id', id)

  if (error) {
    console.error('[vote] Fetch error:', error.message)
    return Response.json({ error: 'Failed to fetch votes' }, { status: 500 })
  }

  const rows = data ?? []

  const helpful = {
    helpful: rows.filter(r => r.vote_category === 'helpful' && r.vote_value === 'helpful').length,
    not_helpful: rows.filter(r => r.vote_category === 'helpful' && r.vote_value === 'not_helpful').length,
  }
  const verdict = {
    convinced: rows.filter(r => r.vote_category === 'verdict' && r.vote_value === 'convinced').length,
    not_convinced: rows.filter(r => r.vote_category === 'verdict' && r.vote_value === 'not_convinced').length,
  }

  return Response.json({ helpful, verdict })
}
