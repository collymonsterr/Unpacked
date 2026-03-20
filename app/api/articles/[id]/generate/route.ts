import { NextRequest } from 'next/server'
import { writeArticle } from '@/lib/claude'
import { enrichArticleWithImages } from '@/lib/images'
import { getSupabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300 // 5 minutes (Vercel Pro)

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch article record
  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  if (!row.plan) {
    return Response.json({ error: 'Article has no plan' }, { status: 400 })
  }

  try {
    // Step 2: Research & Write
    const rawArticle = await writeArticle(row.query, row.plan)

    // Step 3: Image enrichment (parallel with write already done)
    const enrichedArticle = await enrichArticleWithImages(
      rawArticle,
      row.plan.entities,
      row.plan.visual_strategy?.image_density
    )

    // Save complete article
    await db
      .from('articles')
      .update({
        article: enrichedArticle,
        status: 'complete',
      })
      .eq('id', id)

    return Response.json({ success: true })
  } catch (err) {
    console.error('[generate]', err)
    await db
      .from('articles')
      .update({ status: 'error' })
      .eq('id', id)
    return Response.json({ error: 'Generation failed' }, { status: 500 })
  }
}
