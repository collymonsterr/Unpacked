import { NextRequest } from 'next/server'
import { refineArticle, buildOptionsPrompt } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { generateBlueprint } from '@/lib/blueprint'
import { runEditorialPass, applyEditorRewrites } from '@/lib/editorial-pass'
import { enrichArticleWithImages } from '@/lib/images'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getRateLimitInfo } from '@/lib/rate-limit'
import { generateUniqueSlug } from '@/lib/slug'
import { requireAuth } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'
import { ARTICLE_TYPES, type ArticleType } from '@/lib/article-types'
import type { ArticlePlan, EntityCard, ResearchSynthesis } from '@/types/article'

export const maxDuration = 300

/**
 * Detect whether this is a co-pilot rewrite (has add_findings, remove_findings, or switch_type)
 * vs a standard text-instruction refine.
 */
function isCoPilotRewrite(body: Record<string, unknown>): boolean {
  return (
    (Array.isArray(body.add_findings) && body.add_findings.length > 0) ||
    (Array.isArray(body.remove_findings) && body.remove_findings.length > 0) ||
    typeof body.switch_type === 'string'
  )
}

/**
 * Build a research summary string from findings, respecting add/remove selections.
 */
function buildResearchSummary(
  findings: Array<{ id: string; source: string; content: string; used_in_article: boolean }>,
  addIds: Set<string>,
  removeIds: Set<string>,
): string {
  const included = findings.filter(f => {
    if (removeIds.has(f.id)) return false
    if (f.used_in_article || addIds.has(f.id)) return true
    return false
  })

  return included
    .map(f => `[${f.source}]\n${f.content}`)
    .join('\n\n---\n\n')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  // Refine creates a fork — any authenticated user can do this
  const auth = await requireAuth()
  if (!auth.authorized) return auth.error!

  // Rate limiting — refine is cheaper, allow more
  const { key } = getRateLimitInfo(request)
  const rateResult = await checkRateLimit(`refine:${key}`, 20)
  if (!rateResult.allowed) {
    return Response.json({ error: "You've reached the refinement limit. Try again in a bit." }, { status: 429 })
  }

  const body = await request.json()
  const { instruction, add_findings, remove_findings, switch_type } = body as {
    instruction?: string
    add_findings?: string[]
    remove_findings?: string[]
    switch_type?: string
  }

  // Standard refine requires an instruction; co-pilot rewrite can work without one
  if (!isCoPilotRewrite(body) && (!instruction || typeof instruction !== 'string')) {
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
    const storedOptions = row.generation_options ?? {}
    const rootId = row.root_article_id ?? row.id

    // ── Co-pilot rewrite path ──
    if (isCoPilotRewrite(body)) {
      console.log(`[copilot-refine] Starting co-pilot rewrite for ${id}: +${add_findings?.length ?? 0} -${remove_findings?.length ?? 0} type=${switch_type ?? 'same'}`)

      const findings = (row.research_findings ?? []) as Array<{
        id: string; source: string; source_type: string; url: string; content: string; used_in_article: boolean
      }>
      const entityCards = (row.entity_cards ?? []) as EntityCard[]
      const synthesis = (row.research_synthesis ?? {
        thesis_direction: '', comparison_axes: [], strongest_arguments: {},
        likely_winner: null, caveats: [], community_sentiment_summary: '',
        key_data_points: [], source_quality: '', gaps: [],
      }) as ResearchSynthesis

      // Apply finding selections
      const addIds = new Set(add_findings ?? [])
      const removeIds = new Set(remove_findings ?? [])
      const researchSummary = buildResearchSummary(findings, addIds, removeIds)

      // Determine article plan (may switch type)
      let plan = row.plan as ArticlePlan
      if (switch_type && ARTICLE_TYPES[switch_type as ArticleType]) {
        plan = {
          ...plan,
          article_type: switch_type as ArticleType,
          forbidden_components: [...(ARTICLE_TYPES[switch_type as ArticleType].forbiddenComponents ?? [])],
        }
      }

      // Update findings' used_in_article for the child article
      const updatedFindings = findings.map(f => ({
        ...f,
        used_in_article: removeIds.has(f.id) ? false : (f.used_in_article || addIds.has(f.id)),
      }))

      // Phase 1: Blueprint
      const blueprint = await generateBlueprint(
        row.query,
        plan,
        entityCards,
        synthesis,
        researchSummary,
        storedOptions,
      )

      // Phase 2: Write prose
      // If the creator provided instructions, prepend them to the options prompt
      let optsPrompt = buildOptionsPrompt(storedOptions)
      if (instruction) {
        optsPrompt = `CREATOR INSTRUCTIONS (follow these carefully): ${instruction}\n\n${optsPrompt}`
      }

      const rawArticle = await writeWithGemini(
        row.query,
        plan,
        researchSummary,
        optsPrompt,
        id,
        entityCards,
        synthesis,
        blueprint,
        row.live_data ?? undefined,
      )

      // Phase 3: Editorial pass
      const editorialResult = await runEditorialPass(rawArticle, blueprint, entityCards, id).catch(err => {
        console.warn('[copilot-refine] Editorial pass failed:', (err as Error).message)
        return null
      })

      if (editorialResult && editorialResult.score <= 75 && Object.keys(editorialResult.rewrites).length > 0) {
        applyEditorRewrites(rawArticle, editorialResult)
      }

      // Enrich with images
      const enriched = await enrichArticleWithImages(rawArticle, plan.entities)

      // Preserve hero image from parent
      if (!enriched.thumbnail_url && row.article.thumbnail_url) {
        enriched.thumbnail_url = row.article.thumbnail_url
      }
      if (row.article.hero_attribution && !enriched.hero_attribution) {
        enriched.hero_attribution = row.article.hero_attribution
      }

      // Save as child article
      const newSlug = await generateUniqueSlug(enriched.title ?? row.article.title)
      const { data: newArticle, error: insertError } = await db
        .from('articles')
        .insert({
          slug: newSlug,
          query: row.query,
          status: 'complete',
          plan,
          article: enriched,
          blueprint,
          research_findings: updatedFindings,
          entity_cards: entityCards,
          research_synthesis: synthesis,
          live_data: row.live_data,
          user_id: row.user_id,
          user_name: row.user_name,
          user_avatar: row.user_avatar,
          generation_options: storedOptions,
          parent_article_id: id,
          root_article_id: rootId,
        })
        .select('id, slug, article')
        .single()

      if (insertError || !newArticle) {
        console.error('[copilot-refine] Insert error:', insertError?.message)
        return Response.json({ error: 'Failed to save rewritten article' }, { status: 500 })
      }

      console.log(`[copilot-refine] Complete: ${id} → ${newArticle.id} (${newArticle.slug})`)

      return Response.json({
        article: newArticle.article,
        newArticleId: newArticle.id,
        newSlug: newArticle.slug,
      })
    }

    // ── Standard text-instruction refine path (unchanged) ──
    const { article: refined, suggestion_chips } = await refineArticle(
      row.query,
      row.article,
      instruction!,
      storedOptions,
      id
    )

    const enriched = await enrichArticleWithImages(refined, row.plan?.entities ?? [])

    // Preserve hero image from parent
    if (!enriched.thumbnail_url && row.article.thumbnail_url) {
      enriched.thumbnail_url = row.article.thumbnail_url
    }

    // Create a new child article instead of modifying in-place
    const newSlug = await generateUniqueSlug(enriched.title ?? row.article.title)
    const { data: newArticle, error: insertError } = await db
      .from('articles')
      .insert({
        slug: newSlug,
        query: row.query,
        status: 'complete',
        plan: row.plan,
        article: enriched,
        suggestion_chips,
        user_id: row.user_id,
        user_name: row.user_name,
        user_avatar: row.user_avatar,
        generation_options: storedOptions ?? null,
        parent_article_id: id,
        root_article_id: rootId,
      })
      .select('id, slug, article, suggestion_chips')
      .single()

    if (insertError || !newArticle) {
      console.error('[refine] Insert error:', insertError?.message)
      return Response.json({ error: 'Failed to save refined article' }, { status: 500 })
    }

    return Response.json({
      article: newArticle.article,
      suggestion_chips: newArticle.suggestion_chips,
      newArticleId: newArticle.id,
      newSlug: newArticle.slug,
    })
  } catch (err) {
    console.error('[refine]', err)
    return Response.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
