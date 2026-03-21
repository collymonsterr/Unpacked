import { NextRequest, after } from 'next/server'
import { writeArticle } from '@/lib/claude'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { getSupabaseAdmin } from '@/lib/supabase'

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

  // Set status to generating immediately so the client can poll
  await db
    .from('articles')
    .update({ status: 'generating' })
    .eq('id', id)

  // Run the actual generation in the background after responding
  after(async () => {
    const bgDb = getSupabaseAdmin()
    try {
      // Step 2: Research & Write
      const rawArticle = await writeArticle(row.query, row.plan)

      // Step 3: Image enrichment + hero image (in parallel)
      const [enrichedArticle, heroUrl] = await Promise.all([
        enrichArticleWithImages(
          rawArticle,
          row.plan.entities,
          row.plan.visual_strategy?.image_density
        ),
        fetchThumbnailImage(rawArticle.title, rawArticle.article_type),
      ])

      enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

      // Save complete article
      await bgDb
        .from('articles')
        .update({
          article: enrichedArticle,
          status: 'complete',
        })
        .eq('id', id)

      // Kick off fact-check in the background (non-blocking)
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_SUPABASE_URL
            ? 'http://localhost:3000'
            : 'http://localhost:3000'
        fetch(`${baseUrl}/api/articles/${id}/fact-check`, { method: 'POST' }).catch(() => {})
      } catch {
        // Fact-check failure should never break article generation
      }
    } catch (err) {
      console.error('[generate]', err)
      await bgDb
        .from('articles')
        .update({ status: 'error' })
        .eq('id', id)
    }
  })

  // Respond immediately — client will poll for completion
  return Response.json({ success: true, status: 'generating' })
}
