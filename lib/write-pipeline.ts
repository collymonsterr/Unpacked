/**
 * Shared writing pipeline — used by both create/route.ts (authenticated flow)
 * and start-writing/route.ts (post-sign-in gate flow).
 *
 * Flow (Session 1.7C):
 *   1. Generate blueprint (Gemini Flash, ~5-8s)
 *   2. Write prose (Gemini Flash or Sonnet, ~30-40s)
 *   3. Run editorial pass (Gemini Flash, ~3-15s, skip for breaking_news)
 *   4. Apply any rewrites
 *   5. Fetch images (parallel with step 3)
 *   6. Save article
 *   7. Start fact-check (async)
 */

import { writeWithSonnet, buildOptionsPrompt } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { generateBlueprint } from '@/lib/blueprint'
import { runEditorialPass, applyEditorRewrites } from '@/lib/editorial-pass'
import { enrichArticleWithImages, fetchHeroImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticlePlan, EntityCard, ResearchSynthesis, ArticleContent } from '@/types/article'

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
  const length = (generationOptions?.length as 'quick' | 'standard' | 'deep') ?? 'standard'
  const isDeep = length === 'deep'

  // ── Phase 1: Generate blueprint ──
  const blueprint = await generateBlueprint(
    query,
    plan,
    entityCards ?? [],
    synthesis ?? {
      thesis_direction: '', comparison_axes: [], strongest_arguments: {},
      likely_winner: null, caveats: [], community_sentiment_summary: '',
      key_data_points: [], source_quality: '', gaps: [],
    },
    researchSummary,
    generationOptions,
  )

  // Save blueprint to DB immediately (useful for debugging and future co-pilot)
  await db
    .from('articles')
    .update({ blueprint })
    .eq('id', articleId)

  console.log(`[write-pipeline] Blueprint generated: thesis="${blueprint.thesis.slice(0, 60)}", ${blueprint.sections.length} sections, ${blueprint.target_word_count} target words`)

  // ── Phase 2: Write prose + fetch hero image in parallel ──
  // Hero image only needs the query + article type (from blueprint/plan) — doesn't need prose output.
  // So we start it alongside writing to save 3-5 seconds.
  const heroStyle = plan.research_manifest?.image_queries?.hero?.style as
    'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract' | undefined

  const writeArticle = async (): Promise<ArticleContent> => {
    if (isDeep) {
      console.log('[write-pipeline] Writing with Sonnet (deep mode)')
      return writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, undefined, entityCards, synthesis, blueprint)
    }
    try {
      console.log('[write-pipeline] Writing with Gemini Flash')
      const optsPrompt = buildOptionsPrompt(generationOptions)
      return await writeWithGemini(query, plan, researchSummary, optsPrompt, articleId, entityCards, synthesis, blueprint)
    } catch (geminiErr) {
      const geminiErrMsg = (geminiErr as Error).message
      console.log('[write-pipeline] Gemini failed — falling back to Sonnet:', geminiErrMsg)
      return writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, geminiErrMsg, entityCards, synthesis, blueprint)
    }
  }

  const [rawArticle, heroResult] = await Promise.all([
    writeArticle(),
    fetchHeroImage(
      plan.title,
      plan.article_type,
      undefined,
      plan.hero_image_query,
      plan.quick_verdict_preview,
      articleId,
      heroStyle,
    ).catch(err => {
      console.warn('[write-pipeline] Hero image fetch failed:', (err as Error).message)
      return { url: null, attribution: null }
    }),
  ])

  // ── Phase 3: Editorial pass + product images (parallel) ──
  const isBreakingNews = plan.article_type === 'breaking_news'

  const [editorialResult, enrichedArticle] = await Promise.all([
    // Editorial pass — skip for breaking_news
    isBreakingNews
      ? Promise.resolve(null)
      : runEditorialPass(rawArticle, blueprint, entityCards ?? []).catch(err => {
          console.warn('[write-pipeline] Editorial pass failed:', (err as Error).message)
          return null
        }),
    // Product + section image enrichment (needs article content to know which products)
    enrichArticleWithImages(
      rawArticle,
      plan.entities,
      plan.visual_strategy?.image_density,
    ),
  ])

  // Apply editorial rewrites if score is low enough
  if (editorialResult && editorialResult.score <= 80 && Object.keys(editorialResult.rewrites).length > 0) {
    console.log(`[write-pipeline] Editorial score ${editorialResult.score}/100 — applying ${Object.keys(editorialResult.rewrites).length} rewrites`)
    applyEditorRewrites(enrichedArticle, editorialResult)
  } else if (editorialResult) {
    console.log(`[write-pipeline] Editorial score ${editorialResult.score}/100 — no rewrites needed`)
  }

  // Apply hero image (fetched in parallel with writing)
  enrichedArticle.thumbnail_url = heroResult.url ?? pickBestArticleImage(enrichedArticle)
  if (heroResult.attribution) {
    enrichedArticle.hero_attribution = heroResult.attribution
  }

  // Store hero_image_query on article for future thumbnail replacements
  if (plan.hero_image_query) {
    (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = plan.hero_image_query
  }

  // Save complete article + editorial score
  const updatePayload: Record<string, unknown> = {
    article: enrichedArticle,
    status: 'complete',
  }
  if (editorialResult) {
    updatePayload.editorial_score = editorialResult.score
  }

  await db
    .from('articles')
    .update(updatePayload)
    .eq('id', articleId)

  console.log('[write-pipeline] Article complete, starting fact-check')

  // ── Phase 4: Fact-check (non-blocking — article is already readable) ──
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
