import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'
import type { ArticleVisibility } from '@/types/article'

const VALID_VISIBILITY: ArticleVisibility[] = ['private', 'unlisted', 'published']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  let visibility: ArticleVisibility
  try {
    const body = await request.json()
    if (!VALID_VISIBILITY.includes(body?.visibility)) {
      return Response.json({ error: 'visibility must be private, unlisted, or published' }, { status: 400 })
    }
    visibility = body.visibility
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from('articles')
    .update({ visibility })
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to update visibility' }, { status: 500 })
  }

  return Response.json({ visibility })
}
