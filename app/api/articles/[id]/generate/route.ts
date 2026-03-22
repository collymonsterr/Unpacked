import { NextRequest, after } from 'next/server'
import { writeArticle } from '@/lib/claude'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

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

      // Pass hero_image_subject from plan into article for AI image generation
      if (row.plan.hero_image_subject) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_subject = row.plan.hero_image_subject
      }
      // Store hero_image_query for Brave search fallback
      if (row.plan.hero_image_query) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = row.plan.hero_image_query
      }

      enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

      // Save complete article
      await bgDb
        .from('articles')
        .update({
          article: enrichedArticle,
          status: 'complete',
        })
        .eq('id', id)

      // Run fact-check directly (still inside after(), non-blocking to the user)
      try {
        console.log('[generate] Starting fact-check for', id.slice(0, 8))
        const factCheckResult = await runFactCheck(enrichedArticle)
        let finalArticle = enrichedArticle
        if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
          finalArticle = applyCorrections(enrichedArticle, factCheckResult)
        }
        await bgDb
          .from('articles')
          .update({
            article: finalArticle,
            fact_check: factCheckResult,
            verified_at: new Date().toISOString(),
            status: 'verified',
          })
          .eq('id', id)
        console.log('[generate] Fact-check done:', factCheckResult.total_issues, 'issues')
      } catch (fcErr) {
        console.error('[generate] Fact-check failed (article still complete):', fcErr)
        // Article stays at "complete" — fact-check is optional
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
