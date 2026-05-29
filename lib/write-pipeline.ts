/**
 * Shared writing pipeline — used by both create/route.ts (authenticated flow)
 * and start-writing/route.ts (post-sign-in gate flow).
 *
 * Flow (Session 1.7C + 1.7F):
 *   1. Generate blueprint (Gemini Flash, ~5-8s)
 *   2. Write prose + fetch hero image in parallel (~30-40s)
 *   3. Editorial pass + product images in parallel (~3-15s)
 *   4. Apply any rewrites
 *   5. Save article
 *   6. Start fact-check (async)
 *
 * Timing data is collected and persisted to generation_options.timings.
 */

import { writeWithSonnet, buildOptionsPrompt } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { generateBlueprint } from '@/lib/blueprint'
import { runEditorialPass, applyEditorRewrites } from '@/lib/editorial-pass'
import { enrichArticleWithImages, fetchHeroImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runTripleFactCheck, applyCorrections } from '@/lib/fact-check'
import { generateSocialContent, saveSocialContent } from '@/lib/social-content'
import { generateInteractiveComponent } from '@/lib/interactive-component'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticlePlan, EntityCard, ResearchSynthesis, ArticleContent, ArticleSection } from '@/types/article'

// ── Post-write sanitisation ──

// Types that should NOT have key_takeaways or watch_out_for in executive_summary
const NO_EXEC_SUMMARY_TYPES = new Set([
  'ranked_list', 'myth_buster', 'timeline_article', 'visual_list',
  'news_analysis', 'trend_analysis', 'breaking_news', 'roundup',
])

// Types that get key_takeaways only (no watch_out_for)
const TAKEAWAYS_ONLY_TYPES = new Set(['comparison', 'explainer', 'deep_dive'])

// Types where executive_summary.short_answer duplicates the verdict box —
// suppress it so the article reaches real content faster. Knowledge and news
// types don't need a "Quick Verdict in prose" on top of the amber verdict card.
const SUPPRESS_SHORT_ANSWER_TYPES = new Set([
  'explainer', 'deep_dive', 'myth_buster', 'timeline_article',
  'news_analysis', 'trend_analysis', 'visual_list',
])

// Headings that indicate analytical/advisory sections not suited for visual_list
const VISUAL_LIST_FORBIDDEN_HEADINGS = /\b(key takeaway|watch out|how to find|how to|tips for|things to look|things to watch|practical advice|what to avoid|warnings?|before you|getting started)\b/i

/**
 * Extract a canonical video id from a YouTube/Vimeo URL.
 * Returns null for unparseable / non-supported URLs.
 */
function canonicalVideoId(url: string): string | null {
  if (!url) return null
  // YouTube: 11-char ID required (real IDs are exactly 11 chars).
  // Hallucinated URLs typically have shorter or different-format IDs.
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/i)
  if (yt) {
    const id = yt[1]
    if (id.length !== 11) return null // reject hallucinated short IDs
    return `youtube:${id}`
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) return `vimeo:${vimeo[1]}`
  return null
}

/**
 * Strip video_embed sections whose URL doesn't match a real video found in research.
 * Also removes adjacent image_section duplicates when a video covers the same item.
 *
 * This catches two writer failure modes:
 * 1. Hallucinated URLs (writer invents YouTube IDs when no matching video was found)
 * 2. Image + video pairing for the same item (writer ignores the "pick one" rule)
 */
function sanitiseVideoEmbeds(
  article: ArticleContent,
  videoFindings: import('@/types/article').VideoFinding[] | undefined,
): void {
  if (!Array.isArray(article.sections)) return

  // Build set of canonical IDs from validated findings
  const validIds = new Set<string>()
  if (videoFindings) {
    for (const v of videoFindings) {
      const id = canonicalVideoId(v.url)
      if (id) validIds.add(id)
    }
  }

  // Pass 1: identify video_embed sections to strip (URL doesn't match a real video)
  const sectionsToStrip = new Set<number>()
  article.sections.forEach((s, i) => {
    if (s.type !== 'video_embed') return
    const url = (s as { url?: string }).url ?? ''
    const id = canonicalVideoId(url)
    if (!id || !validIds.has(id)) {
      console.log(`[sanitise-video] Stripping fake video at idx ${i}: ${url.slice(0, 80)}`)
      sectionsToStrip.add(i)
    }
  })

  // Pass 2: identify image_section that immediately precedes a SURVIVING video_embed
  //         covering the same item — drop the image (writer included both, pick video).
  for (let i = 0; i < article.sections.length - 1; i++) {
    const cur = article.sections[i]
    const next = article.sections[i + 1]
    if (cur.type !== 'image_section') continue
    if (next.type !== 'video_embed') continue
    if (sectionsToStrip.has(i + 1)) continue // video being stripped, keep image
    console.log(`[sanitise-video] Dropping redundant image_section at idx ${i} (followed by video_embed)`)
    sectionsToStrip.add(i)
  }

  if (sectionsToStrip.size > 0) {
    article.sections = article.sections.filter((_, i) => !sectionsToStrip.has(i))
    console.log(`[sanitise-video] Stripped ${sectionsToStrip.size} sections total`)
  }
}

/**
 * Hard-code enforcement of article type rules that the model may have ignored.
 * Mutates the article in place.
 */
function sanitiseArticleForType(article: ArticleContent, articleType: string): void {
  // 1. Strip executive summary content for types that shouldn't have it
  if (NO_EXEC_SUMMARY_TYPES.has(articleType) && article.executive_summary) {
    if (article.executive_summary.key_takeaways?.length) {
      console.log(`[sanitise] Stripping ${article.executive_summary.key_takeaways.length} key_takeaways from ${articleType}`)
      article.executive_summary.key_takeaways = []
    }
    if (article.executive_summary.watch_out_for?.length) {
      console.log(`[sanitise] Stripping ${article.executive_summary.watch_out_for.length} watch_out_for from ${articleType}`)
      article.executive_summary.watch_out_for = []
    }
  }

  // 2. Strip watch_out_for for types that only get key_takeaways
  if (TAKEAWAYS_ONLY_TYPES.has(articleType) && article.executive_summary?.watch_out_for?.length) {
    console.log(`[sanitise] Stripping ${article.executive_summary.watch_out_for.length} watch_out_for from ${articleType}`)
    article.executive_summary.watch_out_for = []
  }

  // 2b. Clear redundant short_answer (Quick Verdict prose) for knowledge/news
  //     types — it just restates the amber verdict box above it.
  if (SUPPRESS_SHORT_ANSWER_TYPES.has(articleType) && article.executive_summary?.short_answer) {
    console.log(`[sanitise] Clearing short_answer from ${articleType} (redundant with verdict box)`)
    article.executive_summary.short_answer = ''
  }

  // 3. For visual_list: remove any analytical/advisory sections
  if (articleType === 'visual_list') {
    const before = article.sections.length
    article.sections = article.sections.filter((s: ArticleSection) => {
      const heading = 'heading' in s ? (s as { heading?: string }).heading ?? '' : ''
      if (VISUAL_LIST_FORBIDDEN_HEADINGS.test(heading)) {
        console.log(`[sanitise] Removing visual_list section: "${heading}"`)
        return false
      }
      return true
    })
    if (article.sections.length < before) {
      console.log(`[sanitise] Removed ${before - article.sections.length} forbidden sections from visual_list`)
    }
  }
}

export interface PipelineTimings {
  planning_ms?: number
  research_ms?: number
  blueprint_ms: number
  writing_ms: number
  editorial_ms: number
  images_ms: number
  save_ms: number
  factcheck_ms?: number
  total_ms: number
}

interface WritePipelineParams {
  articleId: string
  query: string
  plan: ArticlePlan
  researchSummary: string
  generationOptions: Record<string, unknown>
  entityCards?: EntityCard[]
  synthesis?: ResearchSynthesis
  liveData?: Record<string, unknown>[]
  /** Video findings (YouTube/Vimeo URLs) for video-topic articles */
  videoFindings?: import('@/types/article').VideoFinding[]
  /** Timing data from the create route (planning + research phases) */
  _timings?: Record<string, number>
}

export async function runWritePipeline({
  articleId,
  query,
  plan,
  researchSummary,
  generationOptions,
  entityCards,
  synthesis,
  liveData,
  videoFindings,
  _timings,
}: WritePipelineParams): Promise<void> {
  const db = getSupabaseAdmin()
  const length = (generationOptions?.length as 'quick' | 'standard' | 'deep') ?? 'standard'
  const isDeep = length === 'deep'
  const pipelineStart = Date.now()
  const t: Record<string, number> = { ...(_timings ?? {}) }

  // ── Phase 1: Generate blueprint ──
  const bpStart = Date.now()
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
    liveData,
  )
  t.blueprint_ms = Date.now() - bpStart

  // Save blueprint to DB — fire-and-forget, don't block the pipeline
  db.from('articles')
    .update({ blueprint })
    .eq('id', articleId)
    .then(() => {})

  console.log(`[write-pipeline] Blueprint in ${t.blueprint_ms}ms: thesis="${blueprint.thesis.slice(0, 60)}", ${blueprint.sections.length} sections`)

  // ── Phase 2: Write prose + fetch hero image in parallel ──
  const heroStyle = plan.research_manifest?.image_queries?.hero?.style as
    'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract' | undefined

  const writeArticle = async (): Promise<ArticleContent> => {
    if (isDeep) {
      return writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, undefined, entityCards, synthesis, blueprint, liveData, videoFindings)
    }
    try {
      const optsPrompt = buildOptionsPrompt(generationOptions)
      return await writeWithGemini(query, plan, researchSummary, optsPrompt, articleId, entityCards, synthesis, blueprint, liveData, videoFindings)
    } catch (geminiErr) {
      const geminiErrMsg = (geminiErr as Error).message
      console.log('[write-pipeline] Gemini failed — falling back to Sonnet:', geminiErrMsg)
      return writeWithSonnet(query, plan, researchSummary, generationOptions, articleId, geminiErrMsg, entityCards, synthesis, blueprint, liveData, videoFindings)
    }
  }

  const writeStart = Date.now()
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
  t.writing_ms = Date.now() - writeStart

  // ── Post-write sanitisation: strip sections forbidden for this article type ──
  sanitiseArticleForType(rawArticle, plan.article_type)

  // ── Post-write video sanitisation: strip hallucinated video URLs and
  //    redundant image_sections that duplicate a video for the same item. ──
  sanitiseVideoEmbeds(rawArticle, videoFindings)

  // ── Phase 3: Editorial pass + product images (parallel) ──
  const isBreakingNews = plan.article_type === 'breaking_news'
  const editStart = Date.now()

  const [editorialResult, enrichedArticle] = await Promise.all([
    isBreakingNews
      ? Promise.resolve(null)
      : runEditorialPass(rawArticle, blueprint, entityCards ?? [], articleId).catch(err => {
          console.warn('[write-pipeline] Editorial pass failed:', (err as Error).message)
          return null
        }),
    enrichArticleWithImages(
      rawArticle,
      plan.entities,
      plan.visual_strategy?.image_density,
      articleId,
    ),
  ])
  t.editorial_ms = Date.now() - editStart

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

  // Save complete article + editorial score + timings
  const saveStart = Date.now()

  const updatePayload: Record<string, unknown> = {
    article: enrichedArticle,
    status: 'complete',
  }
  if (editorialResult) {
    updatePayload.editorial_score = editorialResult.score
  }

  // Persist timing data into generation_options.timings
  const totalMs = Date.now() - pipelineStart + (t.planning_ms ?? 0) + (t.research_ms ?? 0)
  const timings: PipelineTimings = {
    planning_ms: t.planning_ms,
    research_ms: t.research_ms,
    blueprint_ms: t.blueprint_ms,
    writing_ms: t.writing_ms,
    editorial_ms: t.editorial_ms,
    images_ms: 0, // images run in parallel — no additional wall-clock time
    save_ms: 0, // will be set after save
    total_ms: totalMs,
  }
  updatePayload.generation_options = {
    ...(generationOptions ?? {}),
    timings,
  }

  await db
    .from('articles')
    .update(updatePayload)
    .eq('id', articleId)
  t.save_ms = Date.now() - saveStart
  timings.save_ms = t.save_ms
  timings.total_ms = totalMs + t.save_ms

  // Single summary log line
  const fmtS = (ms: number | undefined) => ms != null ? `${(ms / 1000).toFixed(1)}s` : '-'
  console.log(`[pipeline] Complete in ${fmtS(timings.total_ms)}: plan=${fmtS(t.planning_ms)} research=${fmtS(t.research_ms)} blueprint=${fmtS(t.blueprint_ms)} write=${fmtS(t.writing_ms)} editor=${fmtS(t.editorial_ms)} save=${fmtS(t.save_ms)}`)

  // ── Phase 4b: Social content generation (fire-and-forget — never blocks) ──
  // Runs in parallel with fact-check. Fetches creator name from DB.
  ;(async () => {
    try {
      const { data: row } = await db
        .from('articles')
        .select('user_name, slug')
        .eq('id', articleId)
        .single()
      const creatorName = row?.user_name || 'Unpacked'
      const articleUrl = `https://unpacked.fyi/article/${row?.slug ?? articleId}`
      const articleType = plan.article_type ?? ''
      const category = (plan.category ?? '') as string

      const content = await generateSocialContent(
        enrichedArticle,
        query,
        creatorName,
        articleUrl,
        articleType,
        category,
        articleId,
      )
      if (content) {
        await saveSocialContent(articleId, content)
      }
    } catch (err) {
      console.error('[pipeline] Social content generation failed:', (err as Error).message)
    }
  })()

  // ── Phase 4c: Interactive component generation (fire-and-forget — never blocks) ──
  ;(async () => {
    try {
      if (!plan.interactive_component_type) return
      const { data: row } = await db
        .from('articles')
        .select('research_findings')
        .eq('id', articleId)
        .single()
      const findings = (row?.research_findings ?? []) as Array<{ source: string; content: string }>
      const component = await generateInteractiveComponent(enrichedArticle, plan, findings, articleId)
      if (component) {
        await db
          .from('articles')
          .update({ interactive_component: component })
          .eq('id', articleId)
        console.log(`[pipeline] Interactive component saved: ${component.type} for ${articleId}`)
      }
    } catch (err) {
      console.error('[pipeline] Interactive component generation failed:', (err as Error).message)
    }
  })()

  // ── Phase 4: Triple fact-check (non-blocking — article is already readable) ──
  try {
    const fcStart = Date.now()
    const articleCategory = (plan.category ?? '') as string
    const { factCheck: factCheckResult, audit: factCheckAudit } = await runTripleFactCheck(
      enrichedArticle,
      plan.article_type,
      articleCategory,
      articleId,
    )
    let finalArticle = enrichedArticle
    if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
      finalArticle = applyCorrections(enrichedArticle, factCheckResult)
    }
    const fcMs = Date.now() - fcStart
    timings.factcheck_ms = fcMs

    // Update article + timings with fact-check data + audit trail
    await db
      .from('articles')
      .update({
        article: finalArticle,
        fact_check: factCheckResult,
        fact_check_audit: factCheckAudit,
        verified_at: new Date().toISOString(),
        status: 'verified',
        generation_options: {
          ...(generationOptions ?? {}),
          timings,
        },
      })
      .eq('id', articleId)
    console.log(`[pipeline] Fact-check in ${fmtS(fcMs)}: ${factCheckAudit.stages_run} stages, ${factCheckResult.total_issues} issues, ${factCheckAudit.summary.disagreements} disagreements`)
  } catch (fcErr) {
    console.error('[pipeline] Fact-check failed:', fcErr)
  }
}
