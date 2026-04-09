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

  // Rate limiting — refine is cheaper, allow more.
  // Pass the authenticated userId so the bucket is per-user, not IP-wide
  // (NAT'd users would otherwise share the same bucket, and a single user
  // could bypass their own limit by switching IPs).
  const { key } = getRateLimitInfo(request, auth.userId ?? undefined)
  const rateResult = await checkRateLimit(`refine:${key}`, 20)
  if (!rateResult.allowed) {
    return Response.json({ error: "You've reached the refinement limit. Try again in a bit." }, { status: 429 })
  }

  const body = await request.json()
  const { instruction, imageUrl, add_findings, remove_findings, switch_type } = body as {
    instruction?: string
    imageUrl?: string
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
          twitter_findings: row.twitter_findings,
          twitter_summary: row.twitter_summary,
          twitter_sentiment_split: row.twitter_sentiment_split,
          twitter_context_trigger: row.twitter_context_trigger,
          twitter_posts_analysed: row.twitter_posts_analysed,
          interactive_component: row.interactive_component,
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

    // ── Standard text-instruction refine path ──
    // If user attached an image, append placement instruction
    let finalInstruction = instruction!
    if (imageUrl && typeof imageUrl === 'string') {
      finalInstruction += `\n\nThe user has uploaded an image. The image URL is: ${imageUrl}. Insert this image into the article at the location specified in their instruction. Use an image_section component in the article JSON with this URL, layout "single", and the source set to "user_upload". If the user didn't specify a location, place it in the most contextually appropriate section.`
    }

    // Build research context so the refine model has factual grounding
    const findings = (row.research_findings ?? []) as Array<{ source: string; content: string }>
    const researchContext = findings.length > 0
      ? findings.slice(0, 15).map(f => `[${f.source}]\n${f.content}`).join('\n\n---\n\n')
      : undefined

    const { article: refined, suggestion_chips } = await refineArticle(
      row.query,
      row.article,
      finalInstruction,
      storedOptions,
      id,
      researchContext
    )

    // ── Title mutation safeguard ──
    // Unless the user explicitly asked for a title change, revert to original
    const originalTitle = row.article.title
    const titleKeywords = /\b(title|rename|headline|name|call it|retitle)\b/i
    if (refined.title !== originalTitle && !titleKeywords.test(instruction ?? '')) {
      console.warn(`[refine] Title mutation blocked: "${refined.title}" → reverted to "${originalTitle}" (instruction: "${instruction?.slice(0, 80)}")`)
      refined.title = originalTitle
    }

    // ── Structural diff check ──
    // Warn if >50% of sections changed when user asked for a small edit
    const originalSections = row.article.sections ?? []
    const refinedSections = refined.sections ?? []
    if (originalSections.length > 0) {
      let changedCount = 0
      const minLen = Math.min(originalSections.length, refinedSections.length)
      for (let s = 0; s < minLen; s++) {
        if (JSON.stringify(originalSections[s]) !== JSON.stringify(refinedSections[s])) {
          changedCount++
        }
      }
      // Count added/removed sections as changes
      changedCount += Math.abs(originalSections.length - refinedSections.length)
      const changeRatio = changedCount / originalSections.length
      if (changeRatio > 0.5) {
        console.warn(`[refine] High drift: ${changedCount}/${originalSections.length} sections changed (${Math.round(changeRatio * 100)}%) for instruction: "${instruction?.slice(0, 80)}"`)
      }
    }

    // ── Preserve article_type ──
    if (row.article.article_type) {
      refined.article_type = row.article.article_type
    }

    // ── Image preservation check ──
    // If the original article had images and the instruction wasn't to remove them,
    // restore any images the model accidentally wiped
    type ImgData = { image_url?: string | null; search_query?: string | null }
    type ImgSection = { type: string; heading?: string; images?: ImgData[] }

    const originalImageSections = ((row.article.sections ?? []) as Array<{ type: string }>)
      .filter(s => s.type === 'image_section') as unknown as ImgSection[]
    const refinedImageSections = (refined.sections ?? [])
      .filter((s: { type: string }) => s.type === 'image_section') as unknown as ImgSection[]

    const isRemovalInstruction = /\b(remove|delete|drop|get rid of)\b.*\b(image|photo|picture|img)\b/i.test(instruction ?? '')

    if (originalImageSections.length > 0 && !isRemovalInstruction) {
      // Check for images with wiped URLs (model cleared image_url but kept the section)
      for (const section of refinedImageSections) {
        const imgs = section.images ?? []
        for (let i = 0; i < imgs.length; i++) {
          if (!imgs[i].image_url && !imgs[i].search_query) {
            // Find matching original image to restore
            const matchingOriginal = originalImageSections.find(os => os.heading === section.heading)
            if (matchingOriginal) {
              const origImgs = matchingOriginal.images ?? []
              if (origImgs[i]) {
                console.warn(`[refine] Restoring wiped image in "${section.heading}" from original`)
                imgs[i] = { ...imgs[i], ...origImgs[i] }
              }
            }
          }
        }
      }

      // Check if entire image_sections were dropped
      const minExpected = originalImageSections.length - 1 // Allow removing at most 1
      if (refinedImageSections.length < minExpected) {
        console.warn(`[refine] Image sections dropped from ${originalImageSections.length} to ${refinedImageSections.length} — restoring missing`)
        // Find which original image_sections are missing by heading match
        const refinedHeadings = new Set(refinedImageSections.map(s => s.heading))
        for (const origSection of originalImageSections) {
          if (!refinedHeadings.has(origSection.heading)) {
            // Find the original position and re-insert
            const origIdx = (row.article.sections ?? []).indexOf(origSection as never)
            const insertIdx = Math.min(origIdx, refined.sections.length)
            refined.sections.splice(insertIdx, 0, origSection as never)
            console.warn(`[refine] Restored image_section "${origSection.heading}" at position ${insertIdx}`)
          }
        }
      }
    }

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
        research_findings: row.research_findings,
        entity_cards: row.entity_cards,
        research_synthesis: row.research_synthesis,
        live_data: row.live_data,
        twitter_findings: row.twitter_findings,
        twitter_summary: row.twitter_summary,
        twitter_sentiment_split: row.twitter_sentiment_split,
        twitter_context_trigger: row.twitter_context_trigger,
        twitter_posts_analysed: row.twitter_posts_analysed,
        interactive_component: row.interactive_component,
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
