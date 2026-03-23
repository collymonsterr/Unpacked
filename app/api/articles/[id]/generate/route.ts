import { NextRequest, after } from 'next/server'
import { writeWithSonnet } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { runBraveResearch } from '@/lib/brave-research'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

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

  await db.from('articles').update({ status: 'generating' }).eq('id', id)

  after(async () => {
    const bgDb = getSupabaseAdmin()
    try {
      const storedOptions = row.generation_options ?? undefined
      const length = storedOptions?.length ?? 'standard'
      const isDeep = length === 'deep'

      // Step 1: Brave pre-research
      console.log('[generate] Running Brave research for', id.slice(0, 8))
      const research = await runBraveResearch(
        row.query,
        row.plan.entities ?? [],
        row.plan.article_type,
        length as 'quick' | 'standard' | 'deep',
      )

      // Step 2: Write article
      let rawArticle
      if (isDeep) {
        // Deep articles use Sonnet (higher quality, more output tokens)
        console.log('[generate] Writing with Sonnet (deep mode)')
        rawArticle = await writeWithSonnet(row.query, row.plan, research.summary, storedOptions, id)
      } else {
        // Standard/quick use Gemini Flash (fast, cheap)
        try {
          console.log('[generate] Writing with Gemini Flash')
          const optionsPrompt = storedOptions ? buildSimpleOptionsPrompt(storedOptions) : ''
          rawArticle = await writeWithGemini(row.query, row.plan, research.summary, optionsPrompt, id)
        } catch (geminiErr) {
          // Fallback to Sonnet if Gemini fails
          console.log('[fallback] Gemini Flash failed — falling back to Sonnet:', (geminiErr as Error).message)
          rawArticle = await writeWithSonnet(row.query, row.plan, research.summary, storedOptions, id)
        }
      }

      // Step 3: Image enrichment + hero image (parallel)
      const [enrichedArticle, heroUrl] = await Promise.all([
        enrichArticleWithImages(
          rawArticle,
          row.plan.entities,
          row.plan.visual_strategy?.image_density
        ),
        fetchThumbnailImage(rawArticle.title, rawArticle.article_type),
      ])

      if (row.plan.hero_image_subject) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_subject = row.plan.hero_image_subject
      }
      if (row.plan.hero_image_query) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = row.plan.hero_image_query
      }

      enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

      await bgDb
        .from('articles')
        .update({ article: enrichedArticle, status: 'complete' })
        .eq('id', id)

      // Step 4: Fact-check (background)
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
        console.error('[generate] Fact-check failed:', fcErr)
      }
    } catch (err) {
      console.error('[generate]', err)
      await bgDb.from('articles').update({ status: 'error' }).eq('id', id)
    }
  })

  return Response.json({ success: true, status: 'generating' })
}

// Simple options prompt for Gemini (keep short)
function buildSimpleOptionsPrompt(options: Record<string, unknown>): string {
  const parts: string[] = []
  if (options.length === 'quick') parts.push('LENGTH: Concise quick-read. 800-1200 words. Fewer sections, tighter writing.')
  if (options.length === 'deep') parts.push('LENGTH: Comprehensive deep-dive. 4000-6000 words.')
  if (options.tone === 'balanced') parts.push('TONE: Balanced. Present all options fairly.')
  if (options.tone === 'casual') parts.push('TONE: Casual and conversational.')
  if (options.visual === 'minimal') parts.push('VISUALS: Minimal. Focus on text.')
  if (options.visual === 'maximum') parts.push('VISUALS: Maximum. Charts in every section.')
  if (options.location) parts.push(`LOCATION: ${options.location} (only if topic-relevant)`)
  if (options.currency && options.currency !== 'USD') parts.push(`CURRENCY: ${options.currency}`)
  if (options.language && options.language !== 'en') parts.push(`LANGUAGE: Write in ${options.language}`)
  return parts.length > 0 ? '\n\nPREFERENCES:\n' + parts.join('\n') : ''
}
