import { NextRequest } from 'next/server'
import { refineArticle } from '@/lib/claude'
import { enrichArticleWithImages } from '@/lib/images'
import { getSupabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { instruction } = await request.json()

  if (!instruction || typeof instruction !== 'string') {
    return Response.json({ error: 'Instruction is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !row || !row.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  try {
    // Mark as regenerating
    await db.from('articles').update({ status: 'generating' }).eq('id', id)

    const { article: refined, suggestion_chips } = await refineArticle(
      row.query,
      row.article,
      instruction
    )

    const enriched = await enrichArticleWithImages(refined, row.plan?.entities ?? [])

    await db
      .from('articles')
      .update({ article: enriched, suggestion_chips, status: 'complete' })
      .eq('id', id)

    return Response.json({ article: enriched, suggestion_chips })
  } catch (err) {
    console.error('[refine]', err)
    await db.from('articles').update({ status: 'complete' }).eq('id', id)
    return Response.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
