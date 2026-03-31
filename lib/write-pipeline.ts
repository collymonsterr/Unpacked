/**
 * Shared writing pipeline — used by both create/route.ts (authenticated flow)
 * and start-writing/route.ts (post-sign-in gate flow).
 *
 * Runs: writing → image enrichment → hero image → save → fact-check → verify
 */

import { writeWithSonnet, buildOptionsPrompt } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticlePlan, EntityCard, ResearchSynthesis } from '@/types/article'

interface WritePipelineParams {
  articleId: string
  query: string
  plan: ArticlePlan
  researchSummary: string
  generationOptions: Record<string, unknown>
  entityCards?: EntityCard[]
  synthesis?: ResearchSynthesis
}

export async function runWritePipeline({
  articleId,
  query,
  plan,
  researchSummary,
  generationOptions,
  entityCards,
  synthesis,
}: WritePipelineParams): Promise<void> {
  const db = getSupabaseAdmin()

  // Phase 1: Write the article
  let rawArticle
  const length = (generationOptions?.length as 'quick' | 'standard' | 'deep') ?? 'standard'
  const isDeep = length === 'deep'

  if (isDeep) {
    console.log('[write-pipeline] Writing with Sonnet (deep mode)')
    rawArticle = await writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, undefined, entityCards, synthesis)
  } else {
    try {
      console.log('[write-pipeline] Writing with Gemini Flash')
      const optsPrompt = buildOptionsPrompt(generationOptions)
      rawArticle = await writeWithGemini(query, plan, researchSummary, optsPrompt, articleId, entityCards, synthesis)
    } catch (geminiErr) {
      const geminiErrMsg = (geminiErr as Error).message
      console.log('[write-pipeline] Gemini failed — falling back to Sonnet:', geminiErrMsg)
      rawArticle = await writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, geminiErrMsg, entityCards, synthesis)
    }
  }

  // Phase 2: Enrich images + hero thumbnail (parallel)
  const [enrichedArticle, heroUrl] = await Promise.all([
    enrichArticleWithImages(
      rawArticle,
      plan.entities,
      plan.visual_strategy?.image_density
    ),
    fetchThumbnailImage(
      rawArticle.title,
      rawArticle.article_type,
      undefined,
      plan.hero_image_query,
      rawArticle.quick_verdict?.one_liner ?? rawArticle.executive_summary?.short_answer ?? '',
      articleId
    ),
  ])

  enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

  // Store hero_image_query on article for future thumbnail replacements
  if (plan.hero_image_query) {
    (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = plan.hero_image_query
  }

  // Save complete article
  await db
    .from('articles')
    .update({ article: enrichedArticle, status: 'complete' })
    .eq('id', articleId)

  console.log('[write-pipeline] Article complete, starting fact-check')

  // Phase 3: Fact-check (non-blocking — article is already readable)
  try {
    const factCheckResult = await runFactCheck(enrichedArticle)
    let finalArticle = enrichedArticle
    if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
      finalArticle = applyCorrections(enrichedArticle, factCheckResult)
    }
    await db
      .from('articles')
      .update({
        article: finalArticle,
        fact_check: factCheckResult,
        verified_at: new Date().toISOString(),
        status: 'verified',
      })
      .eq('id', articleId)
    console.log('[write-pipeline] Fact-check done:', factCheckResult.total_issues, 'issues')
  } catch (fcErr) {
    console.error('[write-pipeline] Fact-check failed:', fcErr)
  }
}
